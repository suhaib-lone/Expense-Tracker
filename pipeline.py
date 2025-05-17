from sklearn.metrics import mean_absolute_error
from sklearn.pipeline import Pipeline
import pandas as pd
import joblib
def final_pipeline(trained_model,valid_target,train_ep,valid_ep,train_target,processor,MODEL_PATH):
    finalPipeline=Pipeline(
        steps=[
            ('preprocessor', processor),
            ('model', trained_model)
        ]
    )

    finalPipeline.fit(train_ep,train_target)
    # predictions=finalPipeline.predict(valid_ep)
    # MAE=mean_absolute_error(valid_target,predictions)

    # comparison_df = pd.DataFrame({
    # 'Actual': valid_target.values,
    # 'Predicted': predictions,
    # }, index=valid_target.index)

    joblib.dump(finalPipeline, MODEL_PATH)

    # return comparison_df, MAE

