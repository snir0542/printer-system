# Status Filter Feature

## Overview
The status filter allows users to filter photos in the gallery by their print status. The available statuses are:
- `all`: Show all photos (default)
- `pending`: Show only photos that haven't been printed yet
- `printed`: Show only photos that have been printed

## Implementation Details

### Frontend
- **Component**: `EventSearch`
  - Handles the status selection UI
  - Updates the URL with the selected status
  - Triggers a new search when the status changes

- **Component**: `PhotoGallery`
  - Reads the status from the URL query parameters
  - Passes the status to the API when fetching photos
  - Updates the UI based on the filtered results

- **API Service**: `fetchPhotosByEvent`
  - Accepts an optional `status` parameter
  - Includes the status in the API request when provided
  - Handles the response and returns the filtered photos

### Backend
- **Endpoint**: `GET /event/:eventId/photos`
  - Accepts an optional `status` query parameter
  - Filters photos by status when the parameter is provided
  - Returns the filtered list of photos

## Usage

### Setting the Status
1. Select a status from the dropdown in the `EventSearch` component
2. The URL will update to include the status parameter (e.g., `?status=pending`)
3. The photo gallery will refresh to show only photos with the selected status

### Default Behavior
- If no status is specified, all photos are shown
- The status is preserved when refreshing the page
- The status is included in shareable URLs

## Testing
Unit tests are available in:
- `src/__tests__/statusFilter.test.ts` - Tests the status filter logic
- `src/components/__tests__/EventSearch.test.tsx` - Tests the status filter UI
- `src/services/__tests__/api.test.ts` - Tests the API integration
