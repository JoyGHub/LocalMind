import { ToolDefinition } from './tool.interface';

const getBrowserLocation = (): Promise<{ latitude: number; longitude: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      error => {
        let errorMessage = 'Unknown geolocation error.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'User denied the request for Geolocation.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'The request to get user location timed out.';
            break;
        }
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      },
    );
  });
};

export const getUserLatitudeAndLongitude: ToolDefinition = {
  name: 'get_user_latitude_and_longitude',
  description: "Get the user's current approximate latitude and longitude via navigator.geolocation",
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  execute: async () => {
    try {
      const coords = await getBrowserLocation();
      return {
        status: 'success',
        source: 'browser_geolocation',
        latitude: coords.latitude,
        longitude: coords.longitude
      };
    } catch (error: any) {
      return {
        status: 'fail',
        source: 'browser_geolocation',
        error: error.message,
        note: 'LLM should rely on the estimated region or ask the user for clarification.',
      };
    }
  },
};
