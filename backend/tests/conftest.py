import sys
from pathlib import Path

# Automatically add backend directory to sys.path so tests can run from repo root or backend folder
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
