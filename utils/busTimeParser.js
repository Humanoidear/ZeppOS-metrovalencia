export function parseBusEstimations(xmlString) {
    function extractTagContent(tag, str) {
        const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, "g");
        const matches = [];
        let match;
        while ((match = regex.exec(str)) !== null) {
            matches.push(match[1].trim());
        }
        return matches;
    }

    function extractCData(content) {
        if (!content) return null; // Handle null or undefined content
        const cdataMatch = content.match(/<!\[CDATA\[(.*?)\]\]>/);
        return cdataMatch ? cdataMatch[1] : content.trim();
    }

    function extractAttribute(attribute, tag, str) {
        const regex = new RegExp(`<${tag}[^>]*\\b${attribute}="(.*?)"`, "i");
        const match = str.match(regex);
        return match ? match[1] : null;
    }

    // Extract the parada attribute
    const parada = extractAttribute("parada", "estimacion", xmlString);

    // Extract all <bus> blocks within <solo_parada>
    const busRegex = /<bus>([\s\S]*?)<\/bus>/g;
    const busMatches = [...xmlString.matchAll(busRegex)];

    const buses = busMatches.map((busMatch) => {
        const busBlock = busMatch[1];
        return {
            linea: extractTagContent("linea", busBlock)[0] || null,
            destino: extractCData(extractTagContent("destino", busBlock)[0]),
            minutos: extractTagContent("minutos", busBlock)[0] || null,
            horaLlegada: extractTagContent("horaLlegada", busBlock)[0] || null,
            error: extractCData(extractTagContent("error", busBlock)[0]),
        };
    });

    return {
        parada,
        buses,
    };
}

export function addClosestBusInfo(parsedData) {
    if (!parsedData || !parsedData.buses || parsedData.buses.length === 0) {
        return { closestBus: null }; // No buses, no closest bus
    }

    // Filter buses with valid `minutos` or "Next"
    const validBuses = parsedData.buses
        .filter((bus) => bus.minutos && (/^\d+/.test(bus.minutos) || bus.minutos.toLowerCase() === "next")) // Match minutes starting with digits or "Next"
        .map((bus) => ({
            ...bus,
            minutosValue: bus.minutos.toLowerCase() === "next" ? -1 : parseInt(bus.minutos.match(/^\d+/)[0], 10), // Assign -1 for "Next" to prioritize it
        }));

    if (validBuses.length === 0) {
        return { closestBus: null }; // No valid times, no closest bus
    }

    // Find the closest bus
    const minTime = Math.min(...validBuses.map((bus) => bus.minutosValue));
    const closestBuses = validBuses.filter((bus) => bus.minutosValue === minTime);

    // Pick one randomly if there are multiple with the same time
    const closestBus = closestBuses[Math.floor(Math.random() * closestBuses.length)];

    // Add `closestBus` to the data
    return {
        closestBus: {
            linea: closestBus.linea,
            minutos: closestBus.minutos,
        },
    };
}
