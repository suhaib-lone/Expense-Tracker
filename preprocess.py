import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder

def load_data(path):
    return pd.read_csv(path)

def pre_process(ep_, target):
    train_full_ep, valid_full_ep, train_target, valid_target = train_test_split(ep_, target, train_size=0.8, test_size=0.2, random_state=42, shuffle=False)

    numerical_cols = [cname for cname in ep_.columns if ep_[cname].dtype in ['int64', 'float64']]
    categorical_cols = [cname for cname in ep_.columns if ep_[cname].dtype == 'object']

    selected_cols=numerical_cols+categorical_cols
    train_ep=train_full_ep[selected_cols].copy()
    valid_ep=valid_full_ep[selected_cols].copy()

    processor = ColumnTransformer(
        transformers=[
            ('num', SimpleImputer(strategy='median'), numerical_cols),
            ('cat', OneHotEncoder(handle_unknown='ignore',sparse_output=False), categorical_cols)
        ]
    )
    processor.fit(train_ep)
    train_preprocessed = processor.transform(train_ep)  
    valid_preprocessed = processor.transform(valid_ep)  

    return train_preprocessed,valid_preprocessed,train_target, valid_target,train_ep,valid_ep,processor

