import type {
  UBLTextElement,
  UBLNoteElement,
  AccountingSupplierParty,
  AccountingCustomerParty,
  Party,
  TaxTotal,
  LegalMonetaryTotal,
  PaymentTerms,
  InvoiceLine,
  InvoiceLineTaxTotal,
  TaxSubtotal,
  DocumentBody,
} from "../types/apisunat";
import { numberToWords } from "./format";

/**
 * Construye los campos básicos del DocumentBody para documentos SUNAT
 * 
 * @param documentType Tipo de documento: "01" (Factura) o "03" (Boleta)
 * @param serie Serie del documento (4 caracteres, ej: "F001")
 * @param correlativo Número correlativo (8 dígitos, ej: "00000004")
 * @param total Monto total del documento
 * @param notes Notas adicionales opcionales
 * @returns Objeto con los campos básicos del DocumentBody
 */
export const buildBasicDocumentBodyFields = (
  documentType: "01" | "03",
  serie: string,
  correlativo: string,
  total: number,
  notes?: string
): {
  ublVersionID: UBLTextElement;
  customizationID: UBLTextElement;
  id: UBLTextElement;
  issueDate: UBLTextElement;
  issueTime: UBLTextElement;
  invoiceTypeCode: UBLTextElement;
  note: UBLNoteElement[];
  documentCurrencyCode: UBLTextElement;
} => {
  // Obtener fecha y hora actual
  const now = new Date();
  
  // Formatear fecha: YYYY-MM-DD
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const issueDate = `${year}-${month}-${day}`;
  
  // Formatear hora: HH:MM:SS
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const issueTime = `${hours}:${minutes}:${seconds}`;
  
  // Construir ID: serie-correlativo (ej: "F001-00000004")
  const documentId = `${serie}-${correlativo}`;
  
  // Convertir total a palabras
  const totalInWords = numberToWords(total);
  
  // Construir array de notas
  const noteArray: UBLNoteElement[] = [
    {
      _text: totalInWords,
    },
  ];
  
  // Agregar notas adicionales si existen
  if (notes && notes.trim()) {
    noteArray.push({
      _text: notes.trim(),
    });
  }
  
  return {
    ublVersionID: {
      _text: "2.1",
    },
    customizationID: {
      _text: "2.0",
    },
    id: {
      _text: documentId,
    },
    issueDate: {
      _text: issueDate,
    },
    issueTime: {
      _text: issueTime,
    },
    invoiceTypeCode: {
      _attributes: {
        listID: "0101",
      },
      _text: documentType,
    },
    note: noteArray,
    documentCurrencyCode: {
      _text: "PEN",
    },
  };
};

/**
 * Construye el AccountingSupplierParty (datos del proveedor/empresa)
 * 
 * @param ruc RUC de la empresa (11 dígitos)
 * @param commercialName Nombre comercial de la empresa
 * @param legalName Razón social de la empresa
 * @param address Dirección completa concatenada (dirección + distrito + provincia + departamento)
 * @returns AccountingSupplierParty completo
 */
export const buildAccountingSupplierParty = (
  ruc: string,
  commercialName: string,
  legalName: string,
  address: string
): AccountingSupplierParty => {
  // Validar que tengamos los datos necesarios
  if (!ruc || ruc.length !== 11) {
    throw new Error("El RUC debe tener 11 dígitos");
  }
  if (!commercialName || !commercialName.trim()) {
    throw new Error("El nombre comercial es requerido");
  }
  if (!legalName || !legalName.trim()) {
    throw new Error("La razón social es requerida");
  }
  if (!address || !address.trim()) {
    throw new Error("La dirección es requerida");
  }

  return {
    "cac:Party": {
      "cac:PartyIdentification": {
        "cbc:ID": {
          _attributes: {
            schemeID: "6",
          },
          _text: ruc,
        },
      },
      "cac:PartyName": {
        "cbc:Name": {
          _text: commercialName.trim(),
        },
      },
      "cac:PartyLegalEntity": {
        "cbc:RegistrationName": {
          _text: legalName.trim(),
        },
        "cac:RegistrationAddress": {
          "cbc:AddressTypeCode": {
            _text: "0000",
          },
          "cac:AddressLine": {
            "cbc:Line": {
              _text: address.trim(),
            },
          },
        },
      },
    },
  };
};

/**
 * Construye el AccountingCustomerParty (datos del cliente)
 * 
 * @param documentType Tipo de documento: "RUC" o "DNI"
 * @param documentNumber Número de documento del cliente
 * @param name Nombre del cliente
 * @param address Dirección del cliente (opcional)
 * @returns AccountingCustomerParty completo
 */
export const buildAccountingCustomerParty = (
  documentType: "RUC" | "DNI",
  documentNumber: string,
  name: string,
  address?: string
): AccountingCustomerParty => {
  // Validar que tengamos los datos necesarios
  if (!documentType || (documentType !== "RUC" && documentType !== "DNI")) {
    throw new Error('El tipo de documento debe ser "RUC" o "DNI"');
  }
  if (!documentNumber || !documentNumber.trim()) {
    throw new Error("El número de documento es requerido");
  }
  if (!name || !name.trim()) {
    throw new Error("El nombre del cliente es requerido");
  }

  // Determinar schemeID según el tipo de documento
  // RUC → schemeID: "6"
  // DNI → schemeID: "1"
  const schemeID = documentType === "RUC" ? "6" : "1";

  // Construir la estructura base del PartyLegalEntity
  // Si no hay dirección, usar una cadena vacía o el nombre como fallback
  const registrationAddress = address && address.trim() 
    ? {
        "cac:AddressLine": {
          "cbc:Line": {
            _text: address.trim(),
          },
        },
      }
    : {
        "cac:AddressLine": {
          "cbc:Line": {
            _text: name.trim(), // Usar el nombre como fallback si no hay dirección
          },
        },
      };

  const partyLegalEntity: Party["cac:PartyLegalEntity"] = {
    "cbc:RegistrationName": {
      _text: name.trim(),
    },
    "cac:RegistrationAddress": registrationAddress,
  };

  // Construir el Party completo
  const party: Party = {
    "cac:PartyIdentification": {
      "cbc:ID": {
        _attributes: {
          schemeID,
        },
        _text: documentNumber.trim(),
      },
    },
    "cac:PartyLegalEntity": partyLegalEntity,
  };

  return {
    "cac:Party": party,
  };
};

/**
 * Redondea un número a 2 decimales (centavos)
 */
const roundToCents = (value: number): number => {
  return Math.round(value * 100) / 100;
};

/**
 * Construye el LegalMonetaryTotal (totales legales del documento)
 * 
 * @param total Monto total después de descuentos (incluye IGV)
 * @param igvPercentage Porcentaje de IGV: 10 o 18
 * @returns LegalMonetaryTotal completo con LineExtensionAmount, TaxInclusiveAmount y PayableAmount
 */
export const buildLegalMonetaryTotal = (
  total: number,
  igvPercentage: 10 | 18
): LegalMonetaryTotal => {
  // Validar que tengamos los datos necesarios
  if (total < 0) {
    throw new Error("El total no puede ser negativo");
  }
  if (igvPercentage !== 10 && igvPercentage !== 18) {
    throw new Error('El porcentaje de IGV debe ser 10 o 18');
  }

  // Calcular el monto sin IGV (LineExtensionAmount)
  // Si total = X + X*IGV%, entonces X = total / (1 + IGV%)
  const lineExtensionAmount = roundToCents(total / (1 + igvPercentage / 100));

  return {
    "cbc:LineExtensionAmount": {
      _attributes: {
        currencyID: "PEN",
      },
      _text: lineExtensionAmount,
    },
    "cbc:TaxInclusiveAmount": {
      _attributes: {
        currencyID: "PEN",
      },
      _text: total,
    },
    "cbc:PayableAmount": {
      _attributes: {
        currencyID: "PEN",
      },
      _text: total,
    },
  };
};

/**
 * Construye el TaxTotal (impuestos del documento)
 * 
 * @param total Monto total después de descuentos (incluye IGV)
 * @param igvPercentage Porcentaje de IGV: 10 o 18
 * @returns TaxTotal completo con TaxableAmount e IGV calculados
 */
export const buildTaxTotal = (
  total: number,
  igvPercentage: 10 | 18
): TaxTotal => {
  // Validar que tengamos los datos necesarios
  if (total < 0) {
    throw new Error("El total no puede ser negativo");
  }
  if (igvPercentage !== 10 && igvPercentage !== 18) {
    throw new Error('El porcentaje de IGV debe ser 10 o 18');
  }

  // Calcular el monto gravado (sin IGV)
  // Si total = X + X*IGV%, entonces X = total / (1 + IGV%)
  const taxableAmount = roundToCents(total / (1 + igvPercentage / 100));
  
  // Calcular el IGV
  const taxAmount = roundToCents(total - taxableAmount);

  return {
    "cbc:TaxAmount": {
      _attributes: {
        currencyID: "PEN",
      },
      _text: taxAmount,
    },
    "cac:TaxSubtotal": [
      {
        "cbc:TaxableAmount": {
          _attributes: {
            currencyID: "PEN",
          },
          _text: taxableAmount,
        },
        "cbc:TaxAmount": {
          _attributes: {
            currencyID: "PEN",
          },
          _text: taxAmount,
        },
        "cac:TaxCategory": {
          "cac:TaxScheme": {
            "cbc:ID": {
              _text: "1000",
            },
            "cbc:Name": {
              _text: "IGV",
            },
            "cbc:TaxTypeCode": {
              _text: "VAT",
            },
          },
        },
      },
    ],
  };
};

/**
 * Construye el PaymentTerms (términos de pago)
 * 
 * NOTA: Este campo SOLO se incluye en FACTURAS (documentType "01"), 
 * NO se incluye en BOLETAS (documentType "03")
 * 
 * @param paymentMethod Método de pago: "Contado", "Tarjeta", "Transferencia" o "Otros"
 * @returns PaymentTerms[] con un elemento (array según la especificación UBL)
 */
export const buildPaymentTerms = (
  paymentMethod: "Contado" | "Tarjeta" | "Transferencia" | "Otros"
): PaymentTerms[] => {
  return [
    {
      "cbc:ID": {
        _text: "FormaPago",
      },
      "cbc:PaymentMeansID": {
        _text: paymentMethod,
      },
    },
  ];
};

/**
 * Construye el TaxSubtotal para una línea de factura
 */
const buildInvoiceLineTaxSubtotal = (
  taxableAmount: number,
  taxAmount: number,
  igvPercentage: 10 | 18
): TaxSubtotal => {
  return {
    "cbc:TaxableAmount": {
      _attributes: {
        currencyID: "PEN",
      },
      _text: taxableAmount,
    },
    "cbc:TaxAmount": {
      _attributes: {
        currencyID: "PEN",
      },
      _text: taxAmount,
    },
    "cac:TaxCategory": {
      "cbc:Percent": {
        _text: igvPercentage,
      },
      "cbc:TaxExemptionReasonCode": {
        _text: "10", // Gravado
      },
      "cac:TaxScheme": {
        "cbc:ID": {
          _text: "1000",
        },
        "cbc:Name": {
          _text: "IGV",
        },
        "cbc:TaxTypeCode": {
          _text: "VAT",
        },
      },
    },
  };
};

/**
 * Construye el TaxTotal para una línea de factura
 */
const buildInvoiceLineTaxTotal = (
  lineExtensionAmount: number,
  igvPercentage: 10 | 18
): InvoiceLineTaxTotal => {
  // Calcular el IGV de la línea
  // IGV = monto sin IGV * porcentaje de IGV
  const taxAmount = roundToCents(lineExtensionAmount * (igvPercentage / 100));

  return {
    "cbc:TaxAmount": {
      _attributes: {
        currencyID: "PEN",
      },
      _text: taxAmount,
    },
    "cac:TaxSubtotal": [
      buildInvoiceLineTaxSubtotal(lineExtensionAmount, taxAmount, igvPercentage),
    ],
  };
};

/**
 * Construye una línea de factura (InvoiceLine)
 * 
 * @param lineNumber Número de línea (1, 2, 3...)
 * @param quantity Cantidad del producto
 * @param unitPrice Precio unitario SIN IGV
 * @param discountAmount Descuento aplicado (opcional, default 0)
 * @param productDescription Descripción/nombre del producto
 * @param igvPercentage Porcentaje de IGV: 10 o 18
 * @returns InvoiceLine completo
 */
export const buildInvoiceLine = (
  lineNumber: number,
  quantity: number,
  unitPrice: number,
  discountAmount: number,
  productDescription: string,
  igvPercentage: 10 | 18
): InvoiceLine => {
  // Validaciones
  if (lineNumber < 1) {
    throw new Error("El número de línea debe ser mayor a 0");
  }
  if (quantity <= 0) {
    throw new Error("La cantidad debe ser mayor a 0");
  }
  if (unitPrice < 0) {
    throw new Error("El precio unitario no puede ser negativo");
  }
  if (discountAmount < 0) {
    throw new Error("El descuento no puede ser negativo");
  }
  if (!productDescription || !productDescription.trim()) {
    throw new Error("La descripción del producto es requerida");
  }
  if (igvPercentage !== 10 && igvPercentage !== 18) {
    throw new Error('El porcentaje de IGV debe ser 10 o 18');
  }

  // Calcular subtotal de la línea (sin IGV, después de descuentos)
  // Los descuentos se aplican ANTES del IGV
  const lineExtensionAmount = roundToCents(
    Math.max(0, quantity * unitPrice - discountAmount)
  );

  // Precio unitario con IGV (para PricingReference)
  const unitPriceWithIGV = roundToCents(unitPrice * (1 + igvPercentage / 100));

  // Construir TaxTotal de la línea
  const taxTotal = buildInvoiceLineTaxTotal(lineExtensionAmount, igvPercentage);

  return {
    "cbc:ID": {
      _text: lineNumber,
    },
    "cbc:InvoicedQuantity": {
      _attributes: {
        unitCode: "NIU", // Unidad (NIU = Unidad). TODO: Más adelante se pueden agregar otros tipos de unidad
      },
      _text: quantity,
    },
    "cbc:LineExtensionAmount": {
      _attributes: {
        currencyID: "PEN",
      },
      _text: lineExtensionAmount,
    },
    "cac:PricingReference": {
      "cac:AlternativeConditionPrice": {
        "cbc:PriceAmount": {
          _attributes: {
            currencyID: "PEN",
          },
          _text: unitPriceWithIGV,
        },
        "cbc:PriceTypeCode": {
          _text: "01", // Precio con IGV incluido
        },
      },
    },
    "cac:TaxTotal": taxTotal,
    "cac:Item": {
      "cbc:Description": {
        _text: productDescription.trim(),
      },
    },
    "cac:Price": {
      "cbc:PriceAmount": {
        _attributes: {
          currencyID: "PEN",
        },
        _text: unitPrice,
      },
    },
  };
};

/**
 * Tipo para un item de venta con información del producto
 */
type SaleItemWithProduct = {
  productId: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  productName: string;
};

/**
 * Construye el array de InvoiceLine[] a partir de los items de la venta
 * 
 * @param items Array de items de la venta con información del producto
 * @param igvPercentage Porcentaje de IGV: 10 o 18
 * @returns InvoiceLine[] con todas las líneas de detalle
 */
export const buildInvoiceLines = (
  items: SaleItemWithProduct[],
  igvPercentage: 10 | 18
): InvoiceLine[] => {
  if (items.length === 0) {
    throw new Error("Debe haber al menos un item en la venta");
  }

  return items.map((item, index) =>
    buildInvoiceLine(
      index + 1, // Número de línea (1, 2, 3...)
      item.quantity,
      item.unitPrice,
      item.discountAmount ?? 0,
      item.productName,
      igvPercentage
    )
  );
};

/**
 * Tipo para los datos de la venta necesarios para construir el documentBody
 */
type SaleDataForDocumentBody = {
  sale: {
    total: number; // Total SIN IGV
  };
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    discountAmount?: number;
  }>;
};

/**
 * Tipo para los datos del usuario/empresa necesarios
 */
type UserDataForDocumentBody = {
  ruc: string;
  companyName?: string;
  companyCommercialName?: string;
  companyAddress?: string;
  companyDistrict?: string;
  companyProvince?: string;
  companyDepartment?: string;
  IGVPercentage?: 10 | 18;
};

/**
 * Tipo para los datos del cliente necesarios
 */
type CustomerDataForDocumentBody = {
  documentType: "RUC" | "DNI";
  documentNumber: string;
  name: string;
  address?: string;
};

/**
 * Tipo para mapeo de productos (productId -> productName)
 */
type ProductMap = Map<string, string> | Record<string, string>;

/**
 * Construye el DocumentBody completo para documentos SUNAT
 * 
 * @param params Parámetros para construir el documentBody
 * @returns DocumentBody completo listo para enviar a SUNAT
 */
export const buildDocumentBody = (params: {
  documentType: "01" | "03";
  serie: string;
  correlativo: string;
  saleData: SaleDataForDocumentBody;
  customerData: CustomerDataForDocumentBody | null; // null para boletas sin cliente
  userData: UserDataForDocumentBody;
  products: ProductMap; // Map o Record de productId -> productName
  paymentMethod?: "Contado" | "Tarjeta" | "Transferencia" | "Otros"; // Solo para facturas
  notes?: string;
}): DocumentBody => {
  const {
    documentType,
    serie,
    correlativo,
    saleData,
    customerData,
    userData,
    products,
    paymentMethod,
    notes,
  } = params;

  // Validaciones básicas
  if (!userData.ruc || userData.ruc.length !== 11) {
    throw new Error("El RUC de la empresa debe tener 11 dígitos");
  }
  if (!userData.companyName && !userData.companyCommercialName) {
    throw new Error("Se requiere al menos el nombre comercial o la razón social");
  }
  if (documentType === "01" && !customerData) {
    throw new Error("Los datos del cliente son obligatorios para facturas");
  }
  if (saleData.items.length === 0) {
    throw new Error("Debe haber al menos un item en la venta");
  }

  // Obtener porcentaje de IGV (default 18%)
  const igvPercentage = userData.IGVPercentage || 18;

  // Calcular total CON IGV (saleData.sale.total es SIN IGV)
  // totalConIGV = totalSinIGV * (1 + IGV%)
  const totalConIGV = roundToCents(saleData.sale.total * (1 + igvPercentage / 100));

  // Construir dirección completa de la empresa
  const supplierAddress = [
    userData.companyAddress,
    userData.companyDistrict,
    userData.companyProvince,
    userData.companyDepartment,
  ]
    .filter(Boolean)
    .join(", ");

  if (!supplierAddress) {
    throw new Error("La dirección de la empresa es requerida");
  }

  // Construir campos básicos
  const basicFields = buildBasicDocumentBodyFields(
    documentType,
    serie,
    correlativo,
    totalConIGV, // Total CON IGV para las notas
    notes
  );

  // Construir AccountingSupplierParty
  const supplierParty = buildAccountingSupplierParty(
    userData.ruc,
    userData.companyCommercialName || userData.companyName || "",
    userData.companyName || userData.companyCommercialName || "",
    supplierAddress
  );

  // Construir AccountingCustomerParty
  // Para boletas sin cliente, usar datos genéricos
  const customerParty = customerData
    ? buildAccountingCustomerParty(
        customerData.documentType,
        customerData.documentNumber,
        customerData.name,
        customerData.address
      )
    : buildAccountingCustomerParty(
        "DNI",
        "00000000",
        "CLIENTE VARIOS",
        "NO ESPECIFICADO"
      );

  // Construir TaxTotal (necesita total CON IGV)
  const taxTotal = buildTaxTotal(totalConIGV, igvPercentage);

  // Construir LegalMonetaryTotal (necesita total CON IGV)
  const legalMonetaryTotal = buildLegalMonetaryTotal(totalConIGV, igvPercentage);

  // Construir PaymentTerms (solo para facturas)
  const paymentTerms =
    documentType === "01" && paymentMethod
      ? buildPaymentTerms(paymentMethod)
      : undefined;

  // Mapear items con nombres de productos
  const itemsWithProducts: SaleItemWithProduct[] = saleData.items.map(
    (item) => {
      const productName =
        products instanceof Map
          ? products.get(item.productId) || "Producto"
          : products[item.productId] || "Producto";

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount,
        productName,
      };
    }
  );

  // Construir InvoiceLines
  const invoiceLines = buildInvoiceLines(itemsWithProducts, igvPercentage);

  // Construir y retornar el DocumentBody completo
  return {
    "cbc:UBLVersionID": basicFields.ublVersionID,
    "cbc:CustomizationID": basicFields.customizationID,
    "cbc:ID": basicFields.id,
    "cbc:IssueDate": basicFields.issueDate,
    "cbc:IssueTime": basicFields.issueTime,
    "cbc:InvoiceTypeCode": basicFields.invoiceTypeCode,
    "cbc:Note": basicFields.note,
    "cbc:DocumentCurrencyCode": basicFields.documentCurrencyCode,
    "cac:AccountingSupplierParty": supplierParty,
    "cac:AccountingCustomerParty": customerParty,
    "cac:TaxTotal": taxTotal,
    "cac:LegalMonetaryTotal": legalMonetaryTotal,
    ...(paymentTerms && { "cac:PaymentTerms": paymentTerms }),
    "cac:InvoiceLine": invoiceLines,
  };
};

