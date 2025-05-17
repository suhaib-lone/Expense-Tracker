import pandas as pd
import joblib
import os
from preprocess import pre_process,load_data
from evaluate import grid_search
from train import train_model
from pipeline import final_pipeline
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from io import StringIO
MODEL_PATH='./models/training_model.pkl'

app=FastAPI()

ep=load_data('data/expenses.csv')
ep_grouped=ep.groupby('Date').sum()
target=ep_grouped['Amount']
ep_grouped=ep_grouped.drop(['Amount'],axis=1)
ep_=ep_grouped  

# print(ep_)

train_preprocessed,valid_preprocessed,train_target, valid_target,train_ep,valid_ep,processor=pre_process(ep_, target)

if os.path.exists(MODEL_PATH):
    print("Loading saved model...")
    predictPipeline = joblib.load(MODEL_PATH)
else:

    best_params=grid_search(train_preprocessed,train_target)
    trained_model=train_model(best_params)

    # comparison_df,MAE=
    final_pipeline(trained_model,valid_target,train_ep,valid_ep,train_target,processor,MODEL_PATH)
    
    # print(comparison_df)
    predictPipeline = joblib.load(MODEL_PATH)


@app.post("/upload_csv")
async def upload_csv(file: UploadFile = File(...)):
    contents=await file.read()
    new_data=pd.read_csv(StringIO(contents.decode()))
    new_data_grouped=new_data.groupby('Date').sum()
    # print(new_data_grouped)

    predictions=predictPipeline.predict(new_data_grouped)

    return JSONResponse(content={"predictions":predictions.tolist()})
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)