# 💰 Expense Tracker

A comprehensive application to manage and analyze your daily expenses.

## ✨ Features

- **💵 Expense Recording**: Log expenses with 📂 categories, 💲 amounts, and 📅 dates.
- **📊 Data Analysis**: Utilize 🧠 machine learning models to predict and evaluate spending patterns.
- **📈 Forecasting**: Predict future expenses using Prophet and XGBoost models.
- **🌐 Web Interface**: User-friendly React-based frontend for uploading data and viewing predictions.

## 🏗️ Project Structure

- 📁 **data/**: Contains datasets used for training and evaluation.
- 📁 **models/**: Stores trained machine learning models.
- 📁 **notebook/**: Jupyter notebooks for data exploration and model development.
- 📁 **frontend/**: React-based frontend for user interaction.
- 📁 **Prophet_/**: Backend implementation using the Prophet model.
- 📁 **Using_xgboost/**: Backend implementation using the XGBoost model.
- 📝 **evaluate.py**: Script to evaluate model performance.
- 📝 **main.py**: Main application script.
- 📝 **pipeline.py**: Defines the data processing pipeline.
- 📝 **preprocess.py**: Handles data preprocessing tasks.
- 📄 **requirements.txt**: Lists all Python dependencies.
- 📝 **train.py**: Script to train machine learning models.

## ⚙️ Installation

### Backend Setup

1. **⬇️ Clone the Repository**:

   ```sh
   git clone https://github.com/suhaib-lone/Expense-Tracker.git
   cd Expense-Tracker
   ```

2. **🛠️ Set Up a Virtual Environment**:

   ```sh
   python3 -m venv env
   source env/bin/activate  # On Windows: env\Scripts\activate
   ```

3. **📦 Install Dependencies**:

   ```sh
   pip install -r requirements.txt
   ```

### Frontend Setup

1. **Navigate to the Frontend Directory**:

   ```sh
   cd frontend
   ```

2. **Install Node.js Dependencies**:

   ```sh
   npm install
   ```

3. **Start the Development Server**:

   ```sh
   npm run dev
   ```

## 🚀 Usage

### Backend

1. **🔄 Data Preprocessing**:

   Prepare your data using:

   ```sh
   python preprocess.py
   ```

2. **🤖 Model Training**:

   Train the model with:

   ```sh
   python train.py
   ```

3. **📉 Evaluation**:

   Assess model performance:

   ```sh
   python evaluate.py
   ```

4. **▶️ Run the Application**:

   Start the backend application:

   ```sh
   python main.py
   ```

### Frontend

1. **Access the Web Interface**:

   Open your browser and navigate to:

   ```
   http://localhost:5173
   ```

2. **Upload Data**:

   Use the file uploader to upload a CSV file containing your expense data.

3. **View Predictions**:

   View the forecasted results and download them as a CSV file.

## 🛠️ Technologies Used

- 🐍 **Backend**: Python, FastAPI, Prophet, XGBoost
- 🌐 **Frontend**: React, TailwindCSS, Chart.js
- 📚 **Libraries**: Jupyter Notebook for 📊 data analysis, machine learning libraries as specified in `requirements.txt`.

## 🤝 Contributing

Contributions are welcome! 🎉 To contribute:

1. 🍴 Fork the repository.
2. 🌱 Create a new branch (`git checkout -b feature-branch`).
3. 💾 Commit your changes (`git commit -m "Description of changes"`).
4. 🚀 Push to the branch (`git push origin feature-branch`).
5. 🔄 Open a Pull Request.

## 📜 License

This project is licensed under the 📄 MIT License.

## 📬 Contact

For any queries, feel free to reach out:

- 🐙 GitHub: [suhaib-lone](https://github.com/suhaib-lone)
- 🔗 LinkedIn: [Suhaib Sareer](https://www.linkedin.com/in/suhaib-sareer-b15564244/)

