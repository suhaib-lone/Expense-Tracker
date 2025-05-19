from preprocess import pre_process,load_data
from train import train_model
from evaluate import grid_search
from pipeline import final_pipeline
import joblib

MODEL_PATH='./models/training_model.pkl'
ep=load_data('data/nwd.csv')
ep_grouped=ep.groupby('Date').sum()
target=ep_grouped['Amount']
ep_grouped=ep_grouped.drop(['Amount'],axis=1)
ep_=ep_grouped  
# print(ep_)

train_preprocessed,valid_preprocessed,train_target, valid_target,train_ep,valid_ep,processor=pre_process(ep_, target)

best_params=grid_search(train_preprocessed,train_target)
trained_model=train_model(best_params)

# comparison_df,MAE=
final_pipeline(trained_model,valid_target,train_ep,valid_ep,train_target,processor,MODEL_PATH)

# print(comparison_df)
predictPipeline = joblib.load(MODEL_PATH)