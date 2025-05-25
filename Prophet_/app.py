import pandas as pd
import joblib
import os
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from io import StringIO
from prophet import Prophet
from fastapi.middleware.cors import CORSMiddleware




MODEL_PATH = '../models/prophet_model.pkl'

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://expense-tracker-blush-phi.vercel.app",
        "https://expense-tracker-git-main-suhaib-lones-projects.vercel.app",
        "https://expense-tracker-n22hciz7m-suhaib-lones-projects.vercel.app",
        "http://localhost:5173"
    ], # Or specify "http://localhost:5173"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
def train_model(data):
    model = Prophet()
    model.fit(data)
    return model


# Load and preprocess data
def load_and_preprocess_data(file_path):
    data = pd.read_csv(file_path)

    # Parse dates in the 'Date' column
    data['Date'] = pd.to_datetime(data['Date'], errors='coerce')

    # Drop rows with invalid dates
    data = data.dropna(subset=['Date'])

    # Group by 'Date' and sum the values
    data_grouped = data.groupby('Date').sum().reset_index()

    # Fill missing dates with y=0
    full_date_range = pd.date_range(start=data_grouped['Date'].min(), end=data_grouped['Date'].max())
    data_grouped = data_grouped.set_index('Date').reindex(full_date_range, fill_value=0).reset_index()
    data_grouped.rename(columns={'index': 'Date'}, inplace=True)

    # Rename columns for Prophet compatibility
    data_grouped.rename(columns={'Date': 'ds', 'Amount': 'y'}, inplace=True)

    return data_grouped

# data = load_and_preprocess_data('../data/nwd.csv')

# if os.path.exists(MODEL_PATH):
#     print("Loading saved Prophet model...")
#     model = joblib.load(MODEL_PATH)
# else:
#     print("Training new Prophet model...")
#     model = Prophet()
#     model.fit(data)
#     joblib.dump(model, MODEL_PATH)

@app.post("/upload_csv")
async def upload_csv(file: UploadFile = File(...)):
    contents = await file.read()
    new_data = StringIO(contents.decode())
    new_data_grouped = load_and_preprocess_data(new_data)
    model = train_model(new_data_grouped)
    
    # Create a DataFrame for the next month's dates
    last_date = new_data_grouped['ds'].max()
    future_dates = pd.date_range(start=last_date, periods=30, freq='D')[1:]  # Next 30 days
    future_df = pd.DataFrame({'ds': future_dates})
    
    # Generate predictions for the next month
    forecast = model.predict(future_df)
    predictions = forecast[['ds', 'yhat']]
    predictions['ds'] = predictions['ds'].astype(str)  # Convert Timestamp to string
    
    response = {"predictions": predictions.to_dict(orient='records')}
    return JSONResponse(content=response)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006)