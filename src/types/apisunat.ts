// Tipos para la API de APISUNAT

export type DocumentType = "01" | "03"; // 01: Factura, 03: Boleta

export type DocumentStatus = "PENDIENTE" | "ACEPTADO" | "RECHAZADO" | "EXCEPCION";

/**
 * Tipos para elementos UBL con atributos y texto
 */
export interface UBLTextElement {
  _text: string | number;
  _attributes?: Record<string, string | number>;
}

export interface UBLNoteElement {
  _text: string;
  _attributes?: {
    languageLocaleID?: string;
  };
}

/**
 * Estructura de Party Identification
 */
export interface PartyIdentification {
  "cbc:ID": UBLTextElement;
}

/**
 * Estructura de Party Name
 */
export interface PartyName {
  "cbc:Name": UBLTextElement;
}

/**
 * Estructura de Address Line
 */
export interface AddressLine {
  "cbc:Line": UBLTextElement;
}

/**
 * Estructura de Registration Address
 */
export interface RegistrationAddress {
  "cbc:AddressTypeCode"?: UBLTextElement;
  "cac:AddressLine": AddressLine;
}

/**
 * Estructura de Party Legal Entity
 */
export interface PartyLegalEntity {
  "cbc:RegistrationName": UBLTextElement;
  "cac:RegistrationAddress": RegistrationAddress;
}

/**
 * Estructura de Party (para Supplier y Customer)
 */
export interface Party {
  "cac:PartyIdentification": PartyIdentification;
  "cac:PartyName"?: PartyName;
  "cac:PartyLegalEntity": PartyLegalEntity;
}

/**
 * Estructura de Accounting Supplier Party
 */
export interface AccountingSupplierParty {
  "cac:Party": Party;
}

/**
 * Estructura de Accounting Customer Party
 */
export interface AccountingCustomerParty {
  "cac:Party": Party;
}

/**
 * Estructura de Tax Scheme
 */
export interface TaxScheme {
  "cbc:ID": UBLTextElement;
  "cbc:Name": UBLTextElement;
  "cbc:TaxTypeCode": UBLTextElement;
}

/**
 * Estructura de Tax Category
 */
export interface TaxCategory {
  "cbc:Percent"?: UBLTextElement;
  "cbc:TaxExemptionReasonCode"?: UBLTextElement;
  "cac:TaxScheme": TaxScheme;
}

/**
 * Estructura de Tax Subtotal
 */
export interface TaxSubtotal {
  "cbc:TaxableAmount": UBLTextElement;
  "cbc:TaxAmount": UBLTextElement;
  "cac:TaxCategory": TaxCategory;
}

/**
 * Estructura de Tax Total (nivel documento)
 */
export interface TaxTotal {
  "cbc:TaxAmount": UBLTextElement;
  "cac:TaxSubtotal": TaxSubtotal[];
}

/**
 * Estructura de Tax Total (nivel línea)
 */
export interface InvoiceLineTaxTotal {
  "cbc:TaxAmount": UBLTextElement;
  "cac:TaxSubtotal": TaxSubtotal[];
}

/**
 * Estructura de Legal Monetary Total
 */
export interface LegalMonetaryTotal {
  "cbc:LineExtensionAmount": UBLTextElement;
  "cbc:TaxInclusiveAmount": UBLTextElement;
  "cbc:PayableAmount": UBLTextElement;
}

/**
 * Estructura de Payment Terms
 */
export interface PaymentTerms {
  "cbc:ID": UBLTextElement;
  "cbc:PaymentMeansID": UBLTextElement;
}

/**
 * Estructura de Pricing Reference
 */
export interface PricingReference {
  "cac:AlternativeConditionPrice": {
    "cbc:PriceAmount": UBLTextElement;
    "cbc:PriceTypeCode": UBLTextElement;
  };
}

/**
 * Estructura de Item
 */
export interface Item {
  "cbc:Description": UBLTextElement;
}

/**
 * Estructura de Price
 */
export interface Price {
  "cbc:PriceAmount": UBLTextElement;
}

/**
 * Estructura de Invoice Line
 */
export interface InvoiceLine {
  "cbc:ID": UBLTextElement;
  "cbc:InvoicedQuantity": UBLTextElement;
  "cbc:LineExtensionAmount": UBLTextElement;
  "cac:PricingReference": PricingReference;
  "cac:TaxTotal": InvoiceLineTaxTotal;
  "cac:Item": Item;
  "cac:Price": Price;
}

/**
 * Estructura completa del documentBody (UBL Invoice)
 */
export interface DocumentBody {
  "cbc:UBLVersionID": UBLTextElement;
  "cbc:CustomizationID": UBLTextElement;
  "cbc:ID": UBLTextElement;
  "cbc:IssueDate": UBLTextElement;
  "cbc:IssueTime": UBLTextElement;
  "cbc:InvoiceTypeCode": UBLTextElement;
  "cbc:Note"?: UBLNoteElement[];
  "cbc:DocumentCurrencyCode": UBLTextElement;
  "cac:AccountingSupplierParty": AccountingSupplierParty;
  "cac:AccountingCustomerParty": AccountingCustomerParty;
  "cac:TaxTotal": TaxTotal;
  "cac:LegalMonetaryTotal": LegalMonetaryTotal;
  "cac:PaymentTerms"?: PaymentTerms[];
  "cac:InvoiceLine": InvoiceLine[];
}

/**
 * Request para emitir un documento (factura o boleta)
 */
export interface EmitDocumentRequest {
  personaId: string;
  personaToken: string;
  fileName: string;
  documentBody: DocumentBody;
  customerEmail?: string;
}

/**
 * Response al emitir un documento
 */
export interface EmitDocumentResponse {
  status: DocumentStatus;
  documentId: string;
}

/**
 * Documento completo obtenido de APISUNAT (según getAll)
 */
export interface APISUNATDocument {
  id: string; // ID del documento (documentId)
  production: boolean;
  status: DocumentStatus;
  type: string; // "01", "03", "D1", etc.
  issueTime: number; // UNIX timestamp - fecha de emisión
  responseTime: number; // UNIX timestamp - fecha de respuesta SUNAT
  fileName: string;
  xml: string; // URL del XML
  cdr: string; // URL del CDR
  faults: unknown[]; // arreglo de errores
  notes: unknown[]; // arreglo de observaciones
  personaId: string;
  reference?: string; // referencia enviada al momento de emitir
}

export type PDFFormat = "A4" | "A5" | "ticket58mm" | "ticket80mm";

/**
 * Parámetros opcionales para listar documentos
 */
export interface ListDocumentsParams {
  limit?: number; // máx. 100
  skip?: number;
  from?: number; // UNIX timestamp
  to?: number; // UNIX timestamp
  status?: DocumentStatus;
  type?: string; // "01", "03", "D1", etc.
  order?: "ASC" | "DESC";
  serie?: string;
  number?: string; // 8 dígitos
}

/**
 * Error response de APISUNAT
 */
export interface APISUNATError {
  error: string;
  message: string;
  statusCode?: number;
}

