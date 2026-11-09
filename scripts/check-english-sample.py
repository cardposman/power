"""Compatibility entry point: validate expanded English pages."""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).with_name('check-english-pages.py')), run_name='__main__')
