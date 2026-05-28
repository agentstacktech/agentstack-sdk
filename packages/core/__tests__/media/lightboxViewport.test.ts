import {
  getLightboxViewportSize,
  shouldOfferOrientationMatch,
} from '../../src/media/lightboxViewport';

describe('sdk.media.lightboxViewport', () => {
  describe('shouldOfferOrientationMatch', () => {
    it('portrait viewport + landscape image → true', () => {
      expect(shouldOfferOrientationMatch(3000, 2000, 390, 844)).toBe(true);
    });
    it('portrait viewport + portrait image → false', () => {
      expect(shouldOfferOrientationMatch(2000, 3000, 390, 844)).toBe(false);
    });
    it('landscape viewport + portrait image → true', () => {
      expect(shouldOfferOrientationMatch(2000, 3000, 844, 390)).toBe(true);
    });
    it('landscape viewport + landscape image → false', () => {
      expect(shouldOfferOrientationMatch(3000, 2000, 844, 390)).toBe(false);
    });
    it('square image → false on portrait viewport', () => {
      expect(shouldOfferOrientationMatch(1000, 1000, 390, 844)).toBe(false);
    });
    it('invalid natural dims → false', () => {
      expect(shouldOfferOrientationMatch(0, 2000, 390, 844)).toBe(false);
    });
  });

  describe('getLightboxViewportSize', () => {
    const origWindow = global.window;

    afterEach(() => {
      global.window = origWindow;
    });

    it('prefers visualViewport when present', () => {
      // @ts-expect-error partial window for unit test
      global.window = {
        innerWidth: 10,
        innerHeight: 10,
        visualViewport: { width: 390, height: 820 },
      };
      expect(getLightboxViewportSize()).toEqual({ w: 390, h: 820 });
    });

    it('falls back to innerWidth/innerHeight', () => {
      // @ts-expect-error partial window
      global.window = {
        innerWidth: 1024,
        innerHeight: 768,
        visualViewport: { width: 0, height: 0 },
      };
      expect(getLightboxViewportSize()).toEqual({ w: 1024, h: 768 });
    });
  });
});
