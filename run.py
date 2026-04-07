#!/usr/bin/env python3
"""
Quick-start runner for the Resume Screening System.
Run from the project root: python run.py
"""
import subprocess
import sys
import os

def get_python_executable():
    """Detect and return the path to the project's virtual environment python."""
    root = os.path.dirname(__file__)
    if sys_platform := sys.platform:
        if sys_platform == "win32":
            venv_python = os.path.join(root, ".venv", "Scripts", "python.exe")
        else:
            venv_python = os.path.join(root, ".venv", "bin", "python")
        
        if os.path.exists(venv_python):
            return venv_python
    return sys.executable

def main():
    backend_dir = os.path.join(os.path.dirname(__file__), "backend")
    python_exe = get_python_executable()
    
    cmd = [
        python_exe, "-m", "uvicorn",
        "main:app",
        "--host", "0.0.0.0",
        "--port", "8000",
        "--reload"
    ]
    print(f"Starting Resume Screening API using: {python_exe}")
    print("Dashboard: http://localhost:8000/")
    print("API docs:  http://localhost:8000/docs\n")
    subprocess.run(cmd, cwd=backend_dir)

if __name__ == "__main__":
    main()
