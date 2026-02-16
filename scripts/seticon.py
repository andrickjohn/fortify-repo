import Cocoa
import sys

def set_icon(source_path, target_path):
    icon = Cocoa.NSImage.alloc().initWithContentsOfFile_(source_path)
    if not icon:
        print(f"Error: Could not load image at {source_path}")
        return False
    
    success = Cocoa.NSWorkspace.sharedWorkspace().setIcon_forFile_options_(icon, target_path, 0)
    if success:
        print(f"Successfully set icon for {target_path}")
    else:
        print(f"Failed to set icon for {target_path}")
    return success

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 seticon.py <imagePath> <filePath>")
        sys.exit(1)
    set_icon(sys.argv[1], sys.argv[2])
