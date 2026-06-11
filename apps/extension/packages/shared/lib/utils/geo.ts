export const altitude = ({ zoom, latitude }: { zoom: number; latitude: number }) => {
  const EARTH_RADIUS_IN_METERS = 6371010;
  const TILE_SIZE = 256;
  const SCREEN_PIXEL_HEIGHT = 768;
  const RADIUS_X_PIXEL_HEIGHT = 27.3611 * EARTH_RADIUS_IN_METERS * SCREEN_PIXEL_HEIGHT;

  const altitude = (RADIUS_X_PIXEL_HEIGHT * Math.cos((latitude * Math.PI) / 180)) / (2 ** zoom * TILE_SIZE);
  return altitude;
};
