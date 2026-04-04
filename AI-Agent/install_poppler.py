"""
Install Poppler for PDF processing
"""
import os
import requests
import zipfile
from pathlib import Path

def download_poppler():
    """Download and install Poppler for Windows"""
    
    print("📥 Downloading Poppler for Windows...")
    
    # Create poppler directory
    poppler_dir = Path("poppler")
    poppler_dir.mkdir(exist_ok=True)
    
    # Download URL for Poppler Windows binaries
    url = "https://github.com/oschwartz10612/poppler-windows/releases/download/v23.08.0-0/Release-23.08.0-0.zip"
    
    try:
        response = requests.get(url, stream=True)
        zip_path = poppler_dir / "poppler.zip"
        
        with open(zip_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        print("✅ Downloaded Poppler")
        
        # Extract
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(poppler_dir)
        
        print("✅ Extracted Poppler")
        
        # Find bin directory
        bin_dirs = list(poppler_dir.rglob("bin"))
        if bin_dirs:
            bin_path = bin_dirs[0]
            print(f"📁 Poppler bin path: {bin_path.absolute()}")
            
            # Add to PATH
            current_path = os.environ.get('PATH', '')
            new_path = f"{bin_path.absolute()};{current_path}"
            os.environ['PATH'] = new_path
            
            print("✅ Added Poppler to PATH")
            return str(bin_path.absolute())
        
    except Exception as e:
        print(f"❌ Error installing Poppler: {e}")
        return None

if __name__ == "__main__":
    download_poppler()
