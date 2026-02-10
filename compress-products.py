#!/usr/bin/env python3
"""
Compress base64 images in products.json for 'Short Sleeve Shirt Kits' products.
"""
import json
import base64
import io
import sys

try:
    from PIL import Image
except ImportError:
    print("Installing Pillow...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow", "-q"])
    from PIL import Image

DATA_FILE = '/home/vmycnmyo/winterleague-cricket/data/products.json'
TARGET_IDS = list(range(67, 87))  # IDs 67-86
MAX_WIDTH = 1200
MAX_HEIGHT = 1200
QUALITY = 70

def compress_base64_image(base64_str):
    """Compress a base64 image and return a new base64 string."""
    if not base64_str or not base64_str.startswith('data:image'):
        return base64_str
    
    try:
        # Extract the base64 data
        header, data = base64_str.split(',', 1)
        image_data = base64.b64decode(data)
        
        # Open image
        img = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if necessary (for JPEG)
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
        
        # Resize if too large
        orig_size = img.size
        ratio = min(MAX_WIDTH / img.width, MAX_HEIGHT / img.height, 1.0)
        if ratio < 1.0:
            new_size = (int(img.width * ratio), int(img.height * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)
        
        # Compress to JPEG
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=QUALITY, optimize=True)
        compressed_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        original_size = len(data)
        new_size = len(compressed_data)
        savings = ((original_size - new_size) / original_size) * 100 if original_size > 0 else 0
        
        print(f"  Compressed: {orig_size} -> {img.size}, {original_size//1024}KB -> {new_size//1024}KB ({savings:.1f}% saved)")
        
        return f'data:image/jpeg;base64,{compressed_data}'
    except Exception as e:
        print(f"  Error compressing image: {e}")
        return base64_str

def main():
    print(f"Loading {DATA_FILE}...")
    with open(DATA_FILE, 'r') as f:
        data = json.load(f)
    
    products = data.get('products', [])
    modified_count = 0
    
    for product in products:
        if product.get('id') in TARGET_IDS:
            name = product.get('name', 'Unknown')
            print(f"\nProcessing: {product['id']} - {name}")
            
            # Compress main image
            if product.get('image'):
                print("  Compressing main image...")
                product['image'] = compress_base64_image(product['image'])
            
            # Compress images array
            if product.get('images'):
                print(f"  Compressing {len(product['images'])} images in array...")
                product['images'] = [compress_base64_image(img) for img in product['images']]
            
            modified_count += 1
    
    print(f"\n\nModified {modified_count} products.")
    
    # Backup and save
    backup_file = DATA_FILE + '.backup'
    print(f"Creating backup at {backup_file}...")
    with open(backup_file, 'w') as f:
        json.dump(data, f)
    
    print(f"Saving compressed data to {DATA_FILE}...")
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)
    
    import os
    orig_size = os.path.getsize(backup_file)
    new_size = os.path.getsize(DATA_FILE)
    print(f"\nFile size: {orig_size // (1024*1024)}MB -> {new_size // (1024*1024)}MB")
    print("Done!")

if __name__ == '__main__':
    main()
