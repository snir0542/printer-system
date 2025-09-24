# Photo Printer System

מערכת הדפסה אוטומטית לתמונות לפי eventId. המערכת מושכת תמונות מהשרת ומדפיסה אותן באופן אוטומטי.

## תכונות

- **הדפסה אוטומטית**: מושך תמונות ממתינות מהשרת ומדפיס אותן
- **ניהול תור הדפסה**: מנהל תור הדפסה עם מנגנון retry
- **תמיכה במספר מדפסות**: תמיכה ב-Windows, macOS ו-Linux
- **API לניהול**: ממשק REST API לניהול המערכת
- **לוגים מפורטים**: מערכת לוגים מתקדמת
- **הדפסה לפי אירוע**: יכולת הדפסה של כל התמונות של אירוע מסוים

## התקנה

1. התקן dependencies:
```bash
npm install
```

2. העתק את קובץ הסביבה:
```bash
cp .env.example .env
```

3. ערוך את קובץ `.env` עם ההגדרות שלך:
```env
PORT=3001
API_BASE_URL=http://localhost:5000/api
PRINTER_NAME=Your_Printer_Name
PRINT_QUALITY=high
PRINT_SIZE=4x6
POLL_INTERVAL_MS=5000
```

## הרצה

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## API Endpoints

### בדיקת סטטוס
- `GET /health` - בדיקת בריאות המערכת
- `GET /status` - סטטוס מפורט של המערכת והתור

### הדפסה
- `POST /print/event/:eventId` - הדפסת כל התמונות של אירוע
- `POST /print/test` - הדפסת בדיקה

### ניהול תור
- `POST /queue/clear` - ניקוי תור ההדפסה

### ניהול polling
- `POST /polling/start` - התחלת polling אוטומטי
- `POST /polling/stop` - עצירת polling

### מדפסות
- `GET /printers` - רשימת מדפסות זמינות

## דוגמאות שימוש

### הדפסת תמונות לפי אירוע
```bash
curl -X POST http://localhost:3001/print/event/EVENT_ID_HERE
```

### בדיקת סטטוס
```bash
curl http://localhost:3001/status
```

### הדפסת בדיקה
```bash
curl -X POST http://localhost:3001/print/test
```

## הגדרת מדפסת

### Windows
1. וודא שהמדפסת מותקנת ופועלת
2. השתמש בשם המדפסת כפי שהוא מופיע ב-Control Panel
3. דוגמה: `PRINTER_NAME=HP LaserJet Pro`

### macOS/Linux
1. וודא שהמדפסת מוגדרת ב-CUPS
2. השתמש בשם המדפסת מ-`lpstat -p`
3. דוגמה: `PRINTER_NAME=HP_LaserJet_Pro`

## פתרון בעיות

### המדפסת לא נמצאת
```bash
# בדוק מדפסות זמינות
curl http://localhost:3001/printers
```

### בעיות חיבור לשרת
- וודא ש-API_BASE_URL נכון
- בדוק שהשרת פועל על הכתובת הנכונה

### בעיות הדפסה
```bash
# הרץ הדפסת בדיקה
curl -X POST http://localhost:3001/print/test
```

## לוגים

הלוגים נשמרים בתיקיית `logs/`:
- `combined.log` - כל הלוגים
- `error.log` - רק שגיאות

## אבטחה

- המערכת לא דורשת אימות (מיועדת לרשת מקומית)
- ניתן להוסיף אימות בעתיד לפי הצורך

## תמיכה בענן

המערכת תומכת בתמונות שנשמרו ב:
- Azure Blob Storage
- AWS S3
- אחסון מקומי

התמונות נמשכות מה-cloudUrl אם זמין, אחרת מה-imageData המקומי.
