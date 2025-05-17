import pandas as pd
import joblib
import os
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from io import StringIO
from prophet import Prophet

MODEL_PATH = '../models/prophet_model.pkl'

app = FastAPI()

# Load and preprocess data
def load_and_preprocess_data(file_path):
    data = pd.read_csv(file_path)
    data_grouped = data.groupby('Date').sum().reset_index()
    data_grouped.rename(columns={'Date': 'ds', 'Amount': 'y'}, inplace=True)
    return data_grouped

data = load_and_preprocess_data('../data/nwd.csv')

if os.path.exists(MODEL_PATH):
    print("Loading saved Prophet model...")
    model = joblib.load(MODEL_PATH)
else:
    print("Training new Prophet model...")
    model = Prophet()
    model.fit(data)
    joblib.dump(model, MODEL_PATH)

@app.post("/upload_csv")
async def upload_csv(file: UploadFile = File(...)):
    contents = await file.read()
    new_data = pd.read_csv(StringIO(contents.decode()))
    new_data_grouped = new_data.groupby('Date').sum().reset_index()
    new_data_grouped.rename(columns={'Date': 'ds'}, inplace=True)

    forecast = model.predict(new_data_grouped)
    predictions = forecast[['ds', 'yhat']]
    predictions['ds'] = predictions['ds'].astype(str)  # Convert Timestamp to string
    
    response = {"predictions": predictions.to_dict(orient='records')}


    return JSONResponse(content=response)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006)