import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { Photo, PrinterConfig } from '../types';
import { logger } from '../utils/logger';
import axios from 'axios';

// Extended interface for the test print
interface TestPhoto extends Omit<Photo, 'originalUrl'> {
  originalUrl?: string;
  imageData: string; // Ensure imageData is required for test photos
}

const execAsync = promisify(exec);

interface PrintResult {
  success: boolean;
  message: string;
  error?: Error;
}

export class PrinterService {
  private config: PrinterConfig;
  private tempDir: string;
  private isPrinting: boolean = false;
  private printQueue: string[] = [];
  private platform: NodeJS.Platform;

  constructor(config: PrinterConfig) {
    this.config = config;
    this.tempDir = path.join(process.cwd(), 'temp');
    this.platform = os.platform();
    this.ensureTempDir().catch(err => {
      logger.error('Failed to initialize temp directory:', err);
    });
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
      logger.info(`Created temp directory at: ${this.tempDir}`);
    }
  }

  /**
   * Print a photo by converting base64 to a temporary file and sending to printer
   */
  async printPhoto(photo: Photo): Promise<boolean> {
    const tempFilePath = path.join(this.tempDir, `${Date.now()}_${photo._id}.jpg`);
    
    try {
      // Handle both base64 data URLs and remote URLs
      let buffer: Buffer;
      if (photo.imageData.startsWith('data:image/')) {
        // Base64 data URL
        const base64Data = photo.imageData.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
        buffer = Buffer.from(base64Data, 'base64');
      } else if (photo.imageData.startsWith('http://') || photo.imageData.startsWith('https://')) {
        // Remote URL - download image
        const response = await axios.get<ArrayBuffer>(photo.imageData, { responseType: 'arraybuffer' });
        buffer = Buffer.from(response.data);
      } else {
        throw new Error('Unsupported imageData format. Expected base64 data URL or http(s) URL.');
      }

      await fs.writeFile(tempFilePath, buffer);
      logger.debug(`Created temp file for printing: ${tempFilePath}`);

      // Add to print queue and process
      this.printQueue.push(tempFilePath);
      return await this.processPrintQueue();
    } catch (error) {
      logger.error(`Failed to prepare photo ${photo._id} for printing:`, error);
      await this.cleanupTempFile(tempFilePath);
      return false;
    }
  }

  /**
   * Process the print queue one item at a time
   */
  private async processPrintQueue(): Promise<boolean> {
    if (this.isPrinting || this.printQueue.length === 0) {
      return true; // Already processing or empty queue
    }

    this.isPrinting = true;
    const fileToPrint = this.printQueue.shift()!;

    try {
      await this.printImageFile(fileToPrint);
      logger.info(`Successfully printed: ${path.basename(fileToPrint)}`);
      await this.cleanupTempFile(fileToPrint);
      return true;
    } catch (error) {
      logger.error(`Failed to print ${fileToPrint}:`, error);
      await this.cleanupTempFile(fileToPrint);
      return false;
    } finally {
      this.isPrinting = false;
      // Process next in queue if any
      if (this.printQueue.length > 0) {
        this.processPrintQueue().catch(err => {
          logger.error('Error processing next print job:', err);
        });
      }
    }
  }

  /**
   * Print an image file using platform-specific commands
   */
  private async printImageFile(filePath: string): Promise<void> {
    let command: string;
    let args: string[] = [];

    try {
      switch (this.platform) {
        case 'win32': {
          // Windows: Prefer mspaint if available; fallback to PowerShell printing
          // Try mspaint first
          command = 'C:\\Windows\\System32\\mspaint.exe';
          args = ['/p', filePath];
          break;
        }
        case 'darwin':
        case 'linux':
          // macOS/Linux - using lpr to print
          command = 'lpr';
          args = [
            '-P', this.config.name || 'default',
            '-#', String(this.config.copies || 1),
            filePath
          ];
          break;
        default:
          throw new Error(`Unsupported platform: ${this.platform}`);
      }

      logger.debug(`Printing with command: ${command} ${args.join(' ')}`);
      
      try {
        await new Promise<void>((resolve, reject) => {
          const child = spawn(command, args, { stdio: 'ignore' });
          
          child.on('close', (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`Print command failed with code ${code}`));
            }
          });
          
          child.on('error', (error) => {
            reject(new Error(`Print command failed to start: ${error.message}`));
          });
        });
      } catch (err) {
        // If on Windows and mspaint failed to spawn, fallback to PowerShell printing
        if (this.platform === 'win32') {
          logger.warn('mspaint not available or failed; falling back to PowerShell printing');
          await new Promise<void>((resolve, reject) => {
            const psCommand = 'powershell';
            const psArgs = [
              '-NoProfile',
              '-Command',
              `Start-Process -FilePath \"${filePath.replace(/\\/g, '/') }\" -Verb Print`
            ];
            const child = spawn(psCommand, psArgs, { stdio: 'ignore' });
            child.on('close', (code) => {
              if (code === 0) {
                resolve();
              } else {
                reject(new Error(`PowerShell print failed with code ${code}`));
              }
            });
            child.on('error', (error) => {
              reject(new Error(`PowerShell print failed to start: ${error.message}`));
            });
          });
        } else {
          throw err;
        }
      }

    } catch (error) {
      logger.error(`Failed to print file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Get list of available printers
   */
  async getAvailablePrinters(): Promise<string[]> {
    const platform = process.platform;
    
    try {
      if (platform === 'win32') {
        // Windows: Use wmic to get printer list
        const { stdout } = await execAsync('wmic printer get name');
        return stdout
          .split('\n')
          .slice(1) // Remove header
          .map(line => line.trim())
          .filter(Boolean);
      } else {
        // macOS/Linux: Use lpstat
        const { stdout } = await execAsync('lpstat -p 2>/dev/null || echo "No printers"');
        if (stdout.includes('No printers')) {
          return [];
        }
        return stdout
          .split('\n')
          .filter(Boolean)
          .map(line => {
            const match = line.match(/printer\s+(\S+)/i);
            return match ? match[1] : '';
          })
          .filter(Boolean);
      }
    } catch (error) {
      logger.error('Failed to get available printers:', error);
      return [];
    }
  }

  /**
   * Test the printer by printing a test page
   */
  async testPrinter(): Promise<PrintResult> {
    const testImagePath = path.join(__dirname, '..', 'assets', 'test-print.jpg');
    const simulate = process.env.PRINTER_TEST_MODE === 'simulate' || process.env.NODE_ENV === 'development';
    if (simulate) {
      logger.info('PRINTER_TEST_MODE enabled, simulating test print.');
      return { success: true, message: 'Test print simulated successfully' };
    }
    
    try {
      // Try to use the test image if it exists
      try {
        await fs.access(testImagePath);
        const testImage: TestPhoto = {
          _id: 'test-print',
          eventId: 'test',
          imageData: `data:image/jpeg;base64,${await fs.readFile(testImagePath, 'base64')}`,
          status: 'pending',
          printStatus: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          originalUrl: ''
        };
        const result = await this.printPhoto(testImage as Photo);
        return result 
          ? { success: true, message: 'Test print queued successfully' }
          : { success: false, message: 'Failed to queue test print' };
      } catch (error) {
        // Fallback to a simple colored test pattern
        logger.warn('Test print image not found, using sample image');
        const testPattern = 'iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4AkEEjIVl5Jf9QAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAAGUlEQVQ4y2NgGAWjYBSMglEwCkbBKBgM4D8AE0wCvZJX7cQAAAAASUVORK5CYII=';
        
        const testImage: TestPhoto = {
          _id: 'test-print',
          eventId: 'test',
          imageData: `data:image/png;base64,${testPattern}`,
          status: 'pending',
          printStatus: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          originalUrl: ''
        };
        
        const result = await this.printPhoto(testImage as Photo);
        return result 
          ? { success: true, message: 'Test print queued successfully' }
          : { success: false, message: 'Failed to queue test print' };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error during test print';
      logger.error('Test print failed:', error);
      return { 
        success: false, 
        message,
        error: error instanceof Error ? error : new Error(message)
      };
    }
  }

  /**
   * Clean up temporary file
   */
  private async cleanupTempFile(filePath: string): Promise<void> {
    if (!filePath) return;
    
    try {
      await fs.access(filePath);
      await fs.unlink(filePath);
      logger.debug(`Cleaned up temp file: ${filePath}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.warn(`Failed to cleanup temp file ${filePath}:`, error);
      }
    }
  }

  /**
   * Get the current print queue status
   */
  public getQueueStatus() {
    return {
      isPrinting: this.isPrinting,
      queueLength: this.printQueue.length,
      currentJob: this.isPrinting && this.printQueue[0] 
        ? path.basename(this.printQueue[0]) 
        : null,
      printerName: this.config.name || 'default',
      printerStatus: this.isPrinting ? 'printing' : 'idle'
    };
  }
}
