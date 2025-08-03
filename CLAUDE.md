# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smart Inventory is an inventory management system for restaurants:
- Normal user can submit `Shortage` report when there is a stock shortage
- Admin user can view and manage all reports, the system will generate guide tables for admin to make orders of the shortage materials
- System will record all the shortage records and the order records for future iteration to a more automatic system

The system consists of a React frontend and AWS Lambda serverless backend with MySQL database.

## Architecture

### Backend (`/backend`)
- **AWS SAM serverless** application deployed to AWS Lambda
- **TypeORM** for database operations with MySQL
- **Functions**:
  - `ocr.ts` - OCR processing using Replicate API for receipt scanning
  - `material.ts` - Material CRUD operations and supplier management
  - `stockShortage.ts` - Stock shortage tracking and email alerts
- **Infrastructure**: Cognito auth, S3 for file storage, SES for emails

### Frontend (`/frontend`)
- **React 18** with TypeScript
- **Arco Design** component library
- **AWS Amplify** for Cognito authentication integration
- **Pages**: Inventory management, OCR processing, shortage tracking

### Key Data Models
- `Material` - Raw materials with stock levels and warning thresholds
- `MaterialStock` - Per-shop stock tracking
- `StockChangeRecord` - Audit trail for all stock changes
- `OcrTask` - Receipt OCR processing status
- `ShortageRecord` - Stock shortage management

## Development Commands

### Frontend
```bash
cd frontend
npm start          # Development server
npm run build      # Production build
npm test           # Run tests
```

### Backend
```bash
cd backend
npm run build      # Webpack build for Lambda
npm test           # Run Jest tests with test DB
make build         # Full build including Sharp dependencies
make deploy        # SAM deploy to AWS
```

### Backend Testing
Tests use local test database with environment:
- `BUCKET_NAME=smart-inventory-publics3bucket-lovmeek8dbym`
- `DB_SECRETS_ID=smart-inventory-db-credentials-local-test` 
- `DB_NAME=inventory`

## Key Implementation Details

### Stock Management
Stock changes use `StockChangeType` enum:
1. `IN` - Incoming stock calibration
2. `OUT` - Outgoing stock consumption  
3. `SHORTAGE` - Shortage calibration (sets stock to 0)
4. `ADJUST` - Routine daily calibration

### OCR Workflow
1. Upload receipt image to S3
2. Process with Replicate OCR API
3. Extract material quantities from text
4. Allow manual calibration before applying stock changes

### Database Connection
Backend uses AWS Secrets Manager for database credentials and VPC configuration for secure database access.

### File Structure Conventions
- Shared types in `/src/types/index.ts` for both frontend and backend
- AWS Lambda functions in `/backend/src/functions/`
- React components in `/frontend/src/components/` and pages in `/frontend/src/pages/`