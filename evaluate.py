from sklearn.model_selection import GridSearchCV
from train import xgmodel



param_grid={
    'n_estimators':[100,300,500],
    'learning_rate':[0.01, 0.05,0.5],
    'max_depth':[3,5,7],
    'subsample':[0.8, 1.0],
    'colsample_bytree':[0.8,1.0]
}

xg_model=xgmodel()

def grid_search(train_preprocessed,train_target):
    grid_search=GridSearchCV(
    estimator=xg_model,
    param_grid=param_grid,
    scoring='neg_mean_absolute_error',
    cv=5,
    verbose=1,
    n_jobs=-1
    )

    grid_search.fit(train_preprocessed,train_target)
    best_params=grid_search.best_params_
    return best_params