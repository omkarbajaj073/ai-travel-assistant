/**
 * Geolocation helper
 */

export async function getLocation() {
	return new Promise((resolve) => {
		if (!navigator.geolocation) {
			resolve(null);
			return;
		}

		navigator.geolocation.getCurrentPosition(
			(position) => {
				resolve({
					lat: position.coords.latitude,
					lon: position.coords.longitude,
					time: new Date().toISOString(),
				});
			},
			() => {
				// User denied or error
				resolve(null);
			},
			{ timeout: 5000, enableHighAccuracy: false }
		);
	});
}

export function getCurrentTime() {
	return new Date().toISOString();
}

