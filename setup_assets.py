"""
setup_assets.py – Run this ONCE after cloning the project on any new machine.

It extracts the M-Pesa brand assets (cover background, Africa map, logos, footer)
from the uploaded weekly report template PPTX and places them in the correct folder.

Usage:
    python setup_assets.py <path_to_Weekly_UAM_Report.pptx>

Example:
    python setup_assets.py "C:\\Downloads\\Weekly_UAM_Report_-_04_May_2026.pptx"
"""
import sys, os, shutil, zipfile

ASSET_DIR = os.path.join(os.path.dirname(__file__), "backend", "scripts", "assets")

# Maps the internal PPTX image names → our asset filenames
IMAGE_MAP = {
    "image1.png": "africa_map.png",
    "image2.png": "mpesa_footer.png",
    "image3.png": "cover_bg.png",
    "image4.png": "red_bullet.png",
    "image5.svg": "further_together.svg",
    "image6.png": "mpesa_logo.png",
}

def extract_assets(pptx_path: str):
    if not os.path.exists(pptx_path):
        print(f"ERROR: File not found: {pptx_path}")
        sys.exit(1)

    os.makedirs(ASSET_DIR, exist_ok=True)
    print(f"Extracting assets from: {pptx_path}")
    print(f"Target folder: {ASSET_DIR}\n")

    extracted = []
    with zipfile.ZipFile(pptx_path, "r") as zf:
        for zip_name, asset_name in IMAGE_MAP.items():
            src = f"ppt/media/{zip_name}"
            dst = os.path.join(ASSET_DIR, asset_name)
            try:
                with zf.open(src) as f_in, open(dst, "wb") as f_out:
                    shutil.copyfileobj(f_in, f_out)
                size = os.path.getsize(dst)
                print(f"  ✅  {asset_name}  ({size:,} bytes)")
                extracted.append(asset_name)
            except KeyError:
                print(f"  ⚠️   {zip_name} not found in PPTX – skipping {asset_name}")

    print(f"\nExtracted {len(extracted)}/{len(IMAGE_MAP)} assets.")
    if len(extracted) >= 4:
        print("\n✅ Setup complete. Brand assets are ready.")
        print("   You can now start the backend: uvicorn app.main:app --reload --port 8000")
    else:
        print("\n⚠️  Some assets are missing. The reports will still generate but without brand images.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python setup_assets.py <path_to_Weekly_UAM_Report.pptx>")
        print("\nThis script extracts the M-Pesa brand images from your PPTX template.")
        sys.exit(0)
    extract_assets(sys.argv[1])
