import pytesseract

# Set the correct path where Tesseract is installed
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Verify installation
print(pytesseract.get_tesseract_version())
