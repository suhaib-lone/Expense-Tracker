from xgboost import XGBRegressor


def xgmodel():

    xg_model=XGBRegressor()
    return xg_model

def train_model(best_params):
    xg_model=XGBRegressor(
    random_state=45,
    n_estimators=best_params['n_estimators'],
    learning_rate=best_params['learning_rate'],
    max_depth=best_params['max_depth'],
    subsample=best_params['subsample'],
    colsample_bytree=best_params['colsample_bytree']
    )
    return xg_model