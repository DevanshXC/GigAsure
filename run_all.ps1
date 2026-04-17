Write-Host "Setting up Backend..."
cd backend
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
Write-Host "Starting Backend on Port 8000 in a new window..."
Start-Process .\venv\Scripts\python.exe -ArgumentList "-m", "uvicorn", "main:app", "--reload", "--port", "8000"

cd ..\mock_zomato_api
Write-Host "Setting up Mock API..."
python -m venv venv
.\venv\Scripts\python.exe -m pip install fastapi uvicorn
Write-Host "Starting Mock API on Port 8001 in a new window..."
Start-Process .\venv\Scripts\python.exe -ArgumentList "-m", "uvicorn", "main:app", "--reload", "--port", "8001"

cd ..\gigsure-frontend
Write-Host "Setting up Frontend..."
npm install
Write-Host "Starting Frontend on Port 3000 in a new window..."
Start-Process npm -ArgumentList "run", "dev"

Write-Host "All services have been launched in separate windows!"
