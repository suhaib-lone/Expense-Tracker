import pandas as pd
import joblib
import os
from preprocess import load_data,pre_process
from evaluate import grid_search
from train import train_model
from pipeline import final_pipeline

MODEL_PATH='./models/final_model.pkl'

def main():
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
        final_pipeline(trained_model,valid_target,train_ep,valid_ep,train_target,processor)
        
        # print(comparison_df)
        predictPipeline = joblib.load(MODEL_PATH)

    new_data=load_data("data/new_data.csv")
    new_data_grouped=new_data.groupby('Date').sum()
    # print(new_data_grouped)

    predictions=predictPipeline.predict(new_data_grouped)
    print(predictions)
if __name__ == "__main__":
    main()