export function stringToJson(messageString: string): object[]{
    messageString = messageString.replace('```json\n', '').replace('```', '');

    let jsonData;
    try {
        jsonData = JSON.parse(messageString);
    } catch (e) {
        console.error('Error parsing JSON', e);
    }

    return jsonData;
}