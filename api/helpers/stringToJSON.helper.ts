// Robust JSON sanitization function to fix common AI response issues
function sanitizeJsonResponse(content: string): string {
  // Remove markdown code block formatting
  content = content.replace(/^```[\w]*\n?/, ''); // Remove opening code block
  content = content.replace(/\n```$/, '');       // Remove closing code block
  content = content.trim();
  
  // Fix common JSON syntax errors in arrays
  // Fix extra quotes like: "Dyslexia"", "Mobility" -> "Dyslexia", "Mobility"
  content = content.replace(/"",\s*"/g, '", "');
  content = content.replace(/""([^"]*)/g, '"$1');
  
  // Fix malformed array elements with extra quotes
  // Pattern: "item"", "next" -> "item", "next"
  content = content.replace(/("([^"]*)")"\s*,\s*"/g, '$1, "');
  
  // Fix trailing commas in arrays and objects
  content = content.replace(/,\s*]/g, ']');
  content = content.replace(/,\s*}/g, '}');
  
  // Fix missing commas between array elements
  content = content.replace(/"\s+"([^"])/g, '", "$1');
  
  // Fix escaped quotes that shouldn't be escaped in JSON strings
  content = content.replace(/\\"/g, '"');
  
  return content;
}

export function stringToJson(messageString: string): object[] {
  let content = messageString.replace('```json\n', '').replace('```', '');
    
  // Apply robust sanitization
  content = sanitizeJsonResponse(content);

  let jsonData;
  try {
    jsonData = JSON.parse(content);
  } catch (parseError) {
    console.warn('Initial JSON parse failed, attempting to fix common issues...');
    console.warn('Parse error:', parseError.message);
    console.warn('Content:', content);
        
    // Try additional sanitization for specific patterns
    let fixedContent = content;
        
    // Fix specific pattern from the error: "Dyslexia"", "Mobility Impairment"
    fixedContent = fixedContent.replace(/"([^"]*)"",\s*"([^"]*)"/g, '"$1", "$2"');
        
    // Fix cases where there might be malformed quotes in arrays
    fixedContent = fixedContent.replace(/("\w+)""\s*,/g, '"$1",');
        
    // Try parsing again
    try {
      jsonData = JSON.parse(fixedContent);
      console.log('Successfully parsed after sanitization');
    } catch (secondError) {
      console.error('Second parse attempt failed:', secondError.message);
            
      // Final fallback: try to extract JSON using regex if it's wrapped in other text
      const jsonMatch = fixedContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          jsonData = JSON.parse(jsonMatch[0]);
          console.log('Successfully extracted and parsed JSON from response');
        } catch (thirdError) {
          console.error('Failed to parse extracted JSON:', thirdError.message);
          console.error('Returning empty array as fallback');
          return [];
        }
      } else {
        console.error('No valid JSON array found in response, returning empty array');
        return [];
      }
    }
  }

  // Ensure we return an array
  if (!Array.isArray(jsonData)) {
    console.warn('Parsed JSON is not an array, wrapping in array');
    return [jsonData];
  }

  return jsonData;
}