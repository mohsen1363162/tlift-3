#!/usr/bin/env python3
import os
import zipfile

def make_zip(source_dir, output_files):
    if not os.path.exists(source_dir):
        print(f"Error: {source_dir} does not exist")
        return False

    for out_path in output_files:
        os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
        with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(source_dir):
                for file in files:
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, source_dir)
                    zipf.write(full_path, rel_path)
        size_kb = round(os.path.getsize(out_path) / 1024)
        print(f"Created {out_path} ({size_kb} KB)")
    return True

if __name__ == "__main__":
    make_zip('dist', [
        'public/public_html.zip',
        'public/cpanel_public_html.zip',
        'public_html.zip'
    ])
