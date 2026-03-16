# Frollz - Film Roll Tracking System

A full-stack application for tracking film photography rolls, built with modern web technologies and containerized with Docker.

## Architecture

- **Backend**: NestJS with TypeScript, ArangoDB database
- **Frontend**: Vue.js 3 with TypeScript and Tailwind CSS
- **Database**: ArangoDB for flexible document storage
- **Containerization**: Docker and Docker Compose

## Features

### Film Management
- **Film Formats**: Define dimensional specifications for film stocks
- **Stocks**: Catalog of available film types with metadata (manufacturer, process, speed, etc.)
- **Rolls**: Individual film roll tracking with state management
- **Roll States**: Historical tracking of roll lifecycle

### Data Model

#### Film Formats
- Form Factor: Roll, Sheet, Instant, Bulk (100ft/400ft)
- Format: 35mm, 110, 120, 220, 4x5, 8x10, Instant formats

#### Stocks  
- Process: ECN-2, E-6, C-41, Black & White
- Manufacturer and brand information
- ISO speed rating
- Tagging system for categorization
- Box image URL for visual reference

#### Rolls
- Unique roll identification
- State tracking: Frozen → Refrigerated → Shelfed → Loaded → Finished → Developed  
- Acquisition tracking (date, method, source)
- X-ray exposure tracking
- Image album integration

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Git

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd frollz
   ```

2. **Start the application**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:5173
   - API: http://localhost:3000
   - API Documentation: http://localhost:3000/api/docs
   - ArangoDB Web Interface: http://localhost:8529 (root/rootpassword)

### Development

For local development without Docker:

**Backend Setup**
```bash
cd frollz-api
npm install
npm run start:dev
```

**Frontend Setup**  
```bash
cd frollz-ui
npm install
npm run dev
```

## API Endpoints

### Film Formats
- `GET /api/film-formats` - List all formats
- `POST /api/film-formats` - Create new format
- `GET /api/film-formats/:key` - Get specific format
- `PATCH /api/film-formats/:key` - Update format
- `DELETE /api/film-formats/:key` - Delete format

### Stocks
- `GET /api/stocks` - List all stocks
- `POST /api/stocks` - Create new stock
- `GET /api/stocks/:key` - Get specific stock
- `PATCH /api/stocks/:key` - Update stock
- `DELETE /api/stocks/:key` - Delete stock

### Rolls
- `GET /api/rolls` - List all rolls
- `POST /api/rolls` - Create new roll
- `GET /api/rolls/:key` - Get specific roll
- `PATCH /api/rolls/:key` - Update roll
- `DELETE /api/rolls/:key` - Delete roll

## Database

The application uses ArangoDB as its primary database. Collections are automatically created on startup:

- `film_formats` - Film format specifications
- `stocks` - Film stock catalog
- `rolls` - Individual roll tracking
- `roll_states` - Roll state change history

## Environment Variables

### Backend (frollz-api)
```env
NODE_ENV=development
ARANGODB_URL=http://arangodb:8529
ARANGODB_DATABASE=frollz  
ARANGODB_USERNAME=root
ARANGODB_PASSWORD=rootpassword
PORT=3000
```

### Frontend (frollz-ui)
```env
VITE_API_URL=http://localhost:3000
```

## Docker Services

- **arangodb**: Database service on port 8529
- **frollz-api**: Backend API service on port 3000  
- **frollz-ui**: Frontend application on port 5173

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.