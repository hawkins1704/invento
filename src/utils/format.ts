const CURRENCY_FORMATTER = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

export const formatCurrency = (value: number) => CURRENCY_FORMATTER.format(value);

export const formatDateTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleString("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString("es-PE", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDuration = (start: number, end: number) => {
  const diffMs = Math.max(0, end - start);
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  return `${hours} h ${minutes.toString().padStart(2, "0")} min`;
};

/**
 * Construye el fileName para documentos SUNAT
 * Formato: RRRRRRRRRRR-TT-SSSS-CCCCCCCC
 * 
 * @param ruc RUC de la empresa (11 dígitos)
 * @param documentType Tipo de documento: "01" (Factura) o "03" (Boleta)
 * @param serie Serie del documento (4 caracteres)
 * @param correlativo Número correlativo (8 dígitos con ceros a la izquierda)
 * @returns fileName formateado según estructura SUNAT
 * 
 * @example
 * buildSunatFileName("20123456789", "01", "F001", "00000001")
 * // Returns: "20123456789-01-F001-00000001"
 */
export const buildSunatFileName = (
  ruc: string,
  documentType: "01" | "03",
  serie: string,
  correlativo: string
): string => {
  // Validar que el RUC tenga 11 dígitos
  if (!ruc || ruc.length !== 11) {
    throw new Error("El RUC debe tener 11 dígitos");
  }

  // Validar que el tipo de documento sea válido
  if (documentType !== "01" && documentType !== "03") {
    throw new Error('El tipo de documento debe ser "01" (Factura) o "03" (Boleta)');
  }

  // Validar que la serie tenga 4 caracteres
  if (!serie || serie.length !== 4) {
    throw new Error("La serie debe tener 4 caracteres");
  }

  // Validar que el correlativo tenga 8 dígitos
  if (!correlativo || correlativo.length !== 8) {
    throw new Error("El correlativo debe tener 8 dígitos");
  }

  // Construir el fileName: RRRRRRRRRRR-TT-SSSS-CCCCCCCC
  return `${ruc}-${documentType}-${serie}-${correlativo}`;
};

/**
 * Convierte un número a palabras en español
 * 
 * @param amount Monto numérico (ej: 13.20)
 * @returns Monto en palabras en mayúsculas (ej: "TRECE CON 20/100 SOLES")
 * 
 * @example
 * numberToWords(13.20) // "TRECE CON 20/100 SOLES"
 * numberToWords(100.50) // "CIEN CON 50/100 SOLES"
 */
export const numberToWords = (amount: number): string => {
  const unidades = [
    "",
    "UNO",
    "DOS",
    "TRES",
    "CUATRO",
    "CINCO",
    "SEIS",
    "SIETE",
    "OCHO",
    "NUEVE",
  ];

  const decenas = [
    "",
    "DIEZ",
    "VEINTE",
    "TREINTA",
    "CUARENTA",
    "CINCUENTA",
    "SESENTA",
    "SETENTA",
    "OCHENTA",
    "NOVENTA",
  ];

  const especiales = [
    "",
    "ONCE",
    "DOCE",
    "TRECE",
    "CATORCE",
    "QUINCE",
    "DIECISÉIS",
    "DIECISIETE",
    "DIECIOCHO",
    "DIECINUEVE",
  ];

  const centenas = [
    "",
    "CIENTO",
    "DOSCIENTOS",
    "TRESCIENTOS",
    "CUATROCIENTOS",
    "QUINIENTOS",
    "SEISCIENTOS",
    "SETECIENTOS",
    "OCHOCIENTOS",
    "NOVECIENTOS",
  ];

  const convertirUnidades = (num: number): string => {
    if (num === 0) return "";
    return unidades[num];
  };

  const convertirDecenas = (num: number): string => {
    if (num < 10) return convertirUnidades(num);
    if (num === 10) return "DIEZ";
    if (num < 20) return especiales[num - 10];
    if (num === 20) return "VEINTE";
    if (num < 30) return `VEINTI${convertirUnidades(num - 20)}`;
    
    const decena = Math.floor(num / 10);
    const unidad = num % 10;
    
    if (unidad === 0) {
      return decenas[decena];
    }
    return `${decenas[decena]} Y ${convertirUnidades(unidad)}`;
  };

  const convertirCentenas = (num: number): string => {
    if (num === 0) return "";
    if (num === 100) return "CIEN";
    
    const centena = Math.floor(num / 100);
    const resto = num % 100;
    
    let resultado = centenas[centena];
    
    if (resto > 0) {
      resultado += ` ${convertirDecenas(resto)}`;
    }
    
    return resultado.trim();
  };

  const convertirMiles = (num: number): string => {
    if (num < 1000) return convertirCentenas(num);
    
    const miles = Math.floor(num / 1000);
    const resto = num % 1000;
    
    let resultado = "";
    
    if (miles === 1) {
      resultado = "MIL";
    } else {
      resultado = `${convertirCentenas(miles)} MIL`;
    }
    
    if (resto > 0) {
      resultado += ` ${convertirCentenas(resto)}`;
    }
    
    return resultado.trim();
  };

  // Separar parte entera y decimales
  const partes = amount.toFixed(2).split(".");
  const parteEntera = parseInt(partes[0], 10);
  const centavos = partes[1] || "00";

  // Convertir parte entera a palabras
  let palabrasEnteras = "";
  
  if (parteEntera === 0) {
    palabrasEnteras = "CERO";
  } else if (parteEntera < 1000) {
    palabrasEnteras = convertirCentenas(parteEntera);
  } else if (parteEntera < 1000000) {
    palabrasEnteras = convertirMiles(parteEntera);
  } else {
    // Para números mayores a un millón (simplificado)
    const millones = Math.floor(parteEntera / 1000000);
    const resto = parteEntera % 1000000;
    
    let resultado = "";
    if (millones === 1) {
      resultado = "UN MILLÓN";
    } else {
      resultado = `${convertirMiles(millones)} MILLONES`;
    }
    
    if (resto > 0) {
      resultado += ` ${convertirMiles(resto)}`;
    }
    
    palabrasEnteras = resultado.trim();
  }

  // Formatear resultado final
  return `${palabrasEnteras} CON ${centavos}/100 SOLES`;
};


