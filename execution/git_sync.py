import subprocess
import sys

def run(args, check=True):
    """Run git command and return output. Raise error on failure if check=True."""
    # Print command for visibility
    # print(f"RUN: git {' '.join(args)}")
    result = subprocess.run(["git"] + args, capture_output=True, text=True)
    
    if check and result.returncode != 0:
        print(f"❌ Error running 'git {' '.join(args)}':")
        print(result.stderr)
        print(result.stdout)
        sys.exit(1)
        
    return result.stdout.strip()

def sync(msg="Sync from Antigravity"):
    print("⏳ Pulling updates...")
    
    # Check status first - if clean, just pull. If dirty, stash? 
    # Actually, commit first is safer to avoid losing work in stash.
    status = run(["status", "--porcelain"])
    
    if status:
        print(f"📝 Committing local changes: {msg}")
        run(["add", "."])
        run(["commit", "-m", msg])
    
    # Pull with rebase to replay local commits on top of remote
    try:
        run(["pull", "--rebase", "origin", "main"])
    except SystemExit:
        print("⚠️ Pull failed. You might have merge conflicts.")
        print("   Fix them manually, then run: git rebase --continue")
        sys.exit(1)
        
    # Push changes (if any)
    print("🚀 Pushing to cloud...")
    run(["push", "origin", "main"])
    
    print("✅ Sync Successful. System is up to date.")

if __name__ == "__main__":
    m = sys.argv[1] if len(sys.argv) > 1 else "Automated Sync"
    sync(m)
