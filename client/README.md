# Printer System UI

A modern web interface for managing and monitoring the photo printing system.

## Features

- **Photo Gallery**: View photos by event ID
- **Batch Operations**: Select and print multiple photos at once
- **Print Status**: Track print job status in real-time
- **Printer Management**: View connected printers and test printing
- **Responsive Design**: Works on desktop and mobile devices

## Technologies

- **Frontend**: React 18, TypeScript, Vite
- **UI**: Material-UI (MUI)
- **State Management**: React Query
- **API**: Axios for HTTP requests
- **Build Tool**: Vite

## Prerequisites

- Node.js (v18+)
- npm (v9+) or yarn
- Printer System API (running on port 3001 by default)

## Installation

1. Navigate to the client directory:
   ```bash
   cd cameraproject/printer-system/client
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Create a `.env` file in the client directory:
   ```env
   VITE_API_BASE_URL=http://localhost:3001
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3002](http://localhost:3002) in your browser

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Base URL for the Printer System API | `http://localhost:3001` |

## Project Structure

```
src/
├── components/     # Reusable UI components
│   ├── Layout/    # Main layout components
│   └── common/    # Shared components
├── pages/         # Page components
│   └── PhotoGallery/  # Photo gallery and management
├── services/      # API services
├── types/         # TypeScript type definitions
└── utils/         # Utility functions
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Development

### Adding New Features

1. Create a new branch for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit them:
   ```bash
   git add .
   git commit -m "Add your feature description"
   ```

3. Push your changes and create a pull request

### Code Style

- Follow the project's ESLint and Prettier configuration
- Use TypeScript for type safety
- Write meaningful commit messages
- Keep components small and focused

## Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. The built files will be available in the `dist` directory

3. Deploy the contents of the `dist` directory to your preferred static file hosting service

## License

[Your License Here]
