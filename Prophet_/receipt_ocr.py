import pytesseract
from PIL import Image
import re
from datetime import datetime
from typing import Optional, Dict, List
import io

# Common expense categories
CATEGORIES = [
    'Food & Dining', 'Bills & Utilities', 'Transport', 'Shopping',
    'Entertainment', 'Healthcare', 'Savings', 'Other'
]

# Keywords for category detection
CATEGORY_KEYWORDS = {
    'Food & Dining': ['restaurant', 'cafe', 'food', 'dining', 'lunch', 'dinner', 'breakfast', 'pizza', 'burger', 'coffee', 'tea', 'snack', 'meal', 'grocery', 'supermarket'],
    'Bills & Utilities': ['electric', 'water', 'gas', 'internet', 'phone', 'mobile', 'utility', 'bill', 'rent', 'lease'],
    'Transport': ['uber', 'lyft', 'taxi', 'gas', 'fuel', 'petrol', 'parking', 'toll', 'metro', 'bus', 'train', 'flight', 'airline'],
    'Shopping': ['store', 'shop', 'mall', 'retail', 'amazon', 'flipkart', 'clothing', 'shoes', 'fashion', 'electronics'],
    'Entertainment': ['movie', 'cinema', 'theatre', 'concert', 'game', 'sport', 'netflix', 'spotify', 'subscription', 'gym'],
    'Healthcare': ['hospital', 'clinic', 'doctor', 'medical', 'pharmacy', 'medicine', 'health', 'dental', 'lab'],
}

def extract_text_from_image(image_bytes: bytes) -> str:
    """
    Extract text from image using OCR
    """
    try:
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Perform OCR
        text = pytesseract.image_to_string(image)
        return text
    except Exception as e:
        raise Exception(f"OCR failed: {str(e)}")

def extract_amount(text: str) -> Optional[float]:
    """
    Extract monetary amount from receipt text
    """
    # Look for common currency patterns
    patterns = [
        r'(?:total|amount|paid|price)[:\s]*(?:₹|rs\.?|inr)?\s*(\d+(?:[,\.]\d{2,3})*(?:\.\d{2})?)',
        r'(?:₹|rs\.?|inr)\s*(\d+(?:[,\.]\d{2,3})*(?:\.\d{2})?)',
        r'(?:total|amount|paid)[:\s]*(\d+(?:[,\.]\d{2,3})*(?:\.\d{2})?)',
        r'\b(\d+\.\d{2})\b',  # Standard decimal format
    ]
    
    amounts = []
    text_lower = text.lower()
    
    for pattern in patterns:
        matches = re.finditer(pattern, text_lower, re.IGNORECASE)
        for match in matches:
            try:
                amount_str = match.group(1).replace(',', '').replace(' ', '')
                amount = float(amount_str)
                if 1 <= amount <= 1000000:  # Reasonable range
                    amounts.append(amount)
            except:
                continue
    
    # Return the largest amount found (usually the total)
    return max(amounts) if amounts else None

def extract_date(text: str) -> Optional[str]:
    """
    Extract date from receipt text
    """
    # Common date patterns
    patterns = [
        r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',  # DD-MM-YYYY or MM-DD-YYYY
        r'(\d{2,4}[-/]\d{1,2}[-/]\d{1,2})',  # YYYY-MM-DD
        r'(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})',  # DD Month YYYY
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            date_str = matches[0]
            # Try to parse the date
            try:
                # Try various formats
                for fmt in ['%d-%m-%Y', '%m-%d-%Y', '%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%Y/%m/%d', '%d %b %Y', '%d %B %Y']:
                    try:
                        parsed_date = datetime.strptime(date_str, fmt)
                        return parsed_date.strftime('%Y-%m-%d')
                    except:
                        continue
            except:
                continue
    
    # Default to today if no date found
    return datetime.now().strftime('%Y-%m-%d')

def extract_merchant(text: str) -> str:
    """
    Extract merchant name (usually at top of receipt)
    """
    lines = text.strip().split('\n')
    # First non-empty line is usually the merchant
    for line in lines[:5]:
        line = line.strip()
        if len(line) > 2 and not re.match(r'^[\d\s\-\/]+$', line):
            return line[:50]  # Limit length
    return "Unknown Merchant"

def suggest_category(text: str) -> str:
    """
    Suggest expense category based on receipt content
    """
    text_lower = text.lower()
    
    scores = {}
    for category, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for keyword in keywords if keyword in text_lower)
        if score > 0:
            scores[category] = score
    
    if scores:
        return max(scores, key=scores.get)
    
    return 'Other'

def extract_items(text: str) -> List[Dict[str, any]]:
    """
    Extract line items from receipt
    """
    items = []
    lines = text.split('\n')
    
    for line in lines:
        # Look for patterns like: Item Name ... Price
        match = re.search(r'(.+?)\s+(?:₹|rs\.?)?\s*(\d+\.?\d{0,2})\s*$', line.strip(), re.IGNORECASE)
        if match:
            item_name = match.group(1).strip()
            try:
                item_price = float(match.group(2))
                if 1 <= item_price <= 10000 and len(item_name) > 2:
                    items.append({
                        'name': item_name,
                        'price': item_price
                    })
            except:
                continue
    
    return items[:10]  # Limit to 10 items

def process_receipt(image_bytes: bytes) -> Dict:
    """
    Main function to process receipt and extract all information
    """
    try:
        # Extract text
        text = extract_text_from_image(image_bytes)
        
        if not text or len(text.strip()) < 10:
            raise Exception("Could not extract meaningful text from receipt")
        
        # Extract information
        amount = extract_amount(text)
        date = extract_date(text)
        merchant = extract_merchant(text)
        category = suggest_category(text)
        items = extract_items(text)
        
        return {
            'success': True,
            'data': {
                'amount': amount,
                'date': date,
                'merchant': merchant,
                'category': category,
                'items': items,
                'raw_text': text[:500],  # First 500 chars
                'confidence': 'high' if amount and date else 'medium' if amount else 'low'
            }
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'data': None
        }
