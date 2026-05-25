/**
 * Loads the PDF.js library from CDN if it's not already loaded.
 */
function loadPdfJS(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      if (pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve(pdfjsLib);
      } else {
        reject(new Error("pdfjsLib not found after script load"));
      }
    };
    script.onerror = () => reject(new Error("Failed to load PDF.js script"));
    document.body.appendChild(script);
  });
}

/**
 * Extracts text from a PDF file.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await loadPdfJS();
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
    fullText += pageText + "\n";
  }
  return fullText.trim();
}

/**
 * Extracts text from plain text files (.txt, .md, .csv)
 */
export function extractTextFromPlainText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve(event.target?.result as string || "");
    };
    reader.onerror = (err) => {
      reject(err);
    };
    reader.readAsText(file);
  });
}

/**
 * Parsers routing based on file extension
 */
export async function parseFile(file: File): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  
  if (extension === "pdf") {
    return extractTextFromPdf(file);
  } else if (extension === "txt" || extension === "md" || extension === "csv") {
    return extractTextFromPlainText(file);
  } else {
    throw new Error(`Formato de arquivo .${extension} não suportado. Use PDF, TXT ou MD.`);
  }
}
