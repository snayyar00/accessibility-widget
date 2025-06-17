export function stringToJson(messageString: string): object[]{
    if (!messageString || typeof messageString !== 'string') {
        console.error('Invalid input: messageString must be a non-empty string');
        return [];
    }

    // Clean up markdown formatting
    messageString = messageString.replace(/```json\n?/g, '').replace(/```/g, '').trim();

    let jsonData;
    try {
        jsonData = JSON.parse(messageString);
    } catch (e) {
        console.error('Error parsing JSON:', e);
        console.error('Raw content:', messageString.substring(0, 200) + '...');
        return []; // Return empty array on parse failure
    }

    // Ensure we return an array even if jsonData is not an array
    if (Array.isArray(jsonData)) {
        return jsonData;
    } else if (jsonData && typeof jsonData === 'object') {
        // If it's a single object, wrap it in an array
        return [jsonData];
    } else {
        console.error('Parsed JSON is not an object or array:', typeof jsonData);
        return [];
    }
}