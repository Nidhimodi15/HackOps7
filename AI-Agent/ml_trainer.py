"""
FINTEL AI - Proper ML Model Training
This is how you ACTUALLY train ML models for anomaly detection
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import pickle
import json
from datetime import datetime, timedelta
import random

class FintelMLTrainer:
    """
    Proper ML training for FINTEL AI
    """
    
    def __init__(self):
        self.models = {}
        self.scaler = StandardScaler()
        self.is_trained = False
    
    def generate_training_data(self, num_samples=1000):
        """
        Generate synthetic training data for demonstration
        In real system, this would come from historical invoices
        """
        
        print(f"🔄 Generating {num_samples} synthetic invoices for training...")
        
        training_data = []
        labels = []  # 0 = normal, 1 = anomaly
        
        for i in range(num_samples):
            # Generate normal invoices (80%)
            if random.random() < 0.8:
                invoice = self._generate_normal_invoice()
                labels.append(0)  # Normal
            else:
                # Generate anomalous invoices (20%)
                invoice = self._generate_anomalous_invoice()
                labels.append(1)  # Anomaly
            
            training_data.append(invoice)
        
        return np.array(training_data), np.array(labels)
    
    def _generate_normal_invoice(self):
        """Generate a normal invoice"""
        
        # Normal amount range: 5K to 50K
        amount = random.uniform(5000, 50000)
        
        # Add some noise to make it realistic
        amount += random.uniform(-500, 500)
        
        # Normal features
        features = [
            amount,                           # Amount
            np.log1p(amount),                # Log amount
            amount % 1000,                   # Remainder (usually not 0)
            random.randint(0, 6),            # Day of week
            random.randint(1, 28),           # Day of month
            random.randint(1, 12),           # Month
            random.randint(8, 15),           # Invoice number length
            random.randint(5, 10)            # Digits in invoice number
        ]
        
        return features
    
    def _generate_anomalous_invoice(self):
        """Generate an anomalous invoice"""
        
        anomaly_type = random.choice(['round_amount', 'high_amount', 'weekend', 'suspicious_pattern'])
        
        if anomaly_type == 'round_amount':
            # Perfectly round amounts
            amount = random.choice([10000, 15000, 20000, 25000, 50000, 75000, 100000])
        
        elif anomaly_type == 'high_amount':
            # Unusually high amounts
            amount = random.uniform(100000, 500000)
        
        elif anomaly_type == 'weekend':
            # Weekend invoices (suspicious)
            amount = random.uniform(10000, 30000)
        
        else:  # suspicious_pattern
            # Other suspicious patterns
            amount = random.uniform(8000, 40000)
        
        features = [
            amount,
            np.log1p(amount),
            amount % 1000,  # Often 0 for round amounts
            random.randint(0, 6),
            random.randint(1, 28),
            random.randint(1, 12),
            random.randint(8, 15),
            random.randint(5, 10)
        ]
        
        return features
    
    def train_models(self, training_data, labels):
        """
        Train ML models on historical data
        """
        
        print("🧠 Training ML models...")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            training_data, labels, test_size=0.2, random_state=42
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train Isolation Forest (unsupervised)
        print("  📊 Training Isolation Forest...")
        self.models['isolation_forest'] = IsolationForest(
            contamination=0.2,  # Expect 20% anomalies
            random_state=42,
            n_estimators=100
        )
        self.models['isolation_forest'].fit(X_train_scaled)
        
        # Train DBSCAN (unsupervised clustering)
        print("  🔍 Training DBSCAN...")
        self.models['dbscan'] = DBSCAN(eps=0.5, min_samples=5)
        self.models['dbscan'].fit(X_train_scaled)
        
        # Evaluate models
        self._evaluate_models(X_test_scaled, y_test)
        
        self.is_trained = True
        print("✅ ML models trained successfully!")
    
    def _evaluate_models(self, X_test, y_test):
        """Evaluate model performance"""
        
        print("\n📈 Model Evaluation:")
        
        # Isolation Forest evaluation
        iso_pred = self.models['isolation_forest'].predict(X_test)
        iso_pred = np.where(iso_pred == -1, 1, 0)  # Convert to binary
        
        accuracy = np.mean(iso_pred == y_test)
        print(f"  Isolation Forest Accuracy: {accuracy:.2%}")
        
        # Count anomalies detected
        anomalies_detected = np.sum(iso_pred)
        actual_anomalies = np.sum(y_test)
        print(f"  Anomalies Detected: {anomalies_detected}/{actual_anomalies}")
    
    def predict_anomaly(self, invoice_features):
        """
        Predict if an invoice is anomalous
        """
        
        if not self.is_trained:
            return {"error": "Models not trained yet!"}
        
        # Scale features
        features_scaled = self.scaler.transform([invoice_features])
        
        # Predict with Isolation Forest
        iso_pred = self.models['isolation_forest'].predict(features_scaled)[0]
        
        # Get anomaly score
        anomaly_score = self.models['isolation_forest'].decision_function(features_scaled)[0]
        
        result = {
            'is_anomaly': iso_pred == -1,
            'anomaly_score': float(anomaly_score),
            'confidence': abs(anomaly_score) * 100,
            'method': 'trained_isolation_forest'
        }
        
        return result
    
    def save_models(self, filepath='fintel_models.pkl'):
        """Save trained models"""
        
        model_data = {
            'models': self.models,
            'scaler': self.scaler,
            'is_trained': self.is_trained,
            'trained_at': datetime.now().isoformat()
        }
        
        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)
        
        print(f"💾 Models saved to {filepath}")
    
    def load_models(self, filepath='fintel_models.pkl'):
        """Load pre-trained models"""
        
        try:
            with open(filepath, 'rb') as f:
                model_data = pickle.load(f)
            
            self.models = model_data['models']
            self.scaler = model_data['scaler']
            self.is_trained = model_data['is_trained']
            
            print(f"✅ Models loaded from {filepath}")
            return True
            
        except FileNotFoundError:
            print(f"❌ Model file {filepath} not found")
            return False

def main():
    """
    Main training pipeline
    """
    
    print("🤖 FINTEL AI - Proper ML Training")
    print("=" * 40)
    
    # Initialize trainer
    trainer = FintelMLTrainer()
    
    # Generate training data
    training_data, labels = trainer.generate_training_data(1000)
    
    print(f"\n📊 Training Data Summary:")
    print(f"  Total samples: {len(training_data)}")
    print(f"  Normal invoices: {np.sum(labels == 0)}")
    print(f"  Anomalous invoices: {np.sum(labels == 1)}")
    
    # Train models
    trainer.train_models(training_data, labels)
    
    # Test prediction
    print("\n🧪 Testing Prediction:")
    
    # Test normal invoice
    normal_invoice = [15000, 9.61, 250, 2, 15, 10, 11, 7]
    result = trainer.predict_anomaly(normal_invoice)
    print(f"Normal invoice (₹15,000): {result}")
    
    # Test suspicious invoice
    suspicious_invoice = [50000, 10.82, 0, 1, 29, 10, 12, 7]
    result = trainer.predict_anomaly(suspicious_invoice)
    print(f"Suspicious invoice (₹50,000): {result}")
    
    # Save models
    trainer.save_models()
    
    print("\n🎉 Training Complete!")
    print("🔗 Now you can use these trained models in FINTEL AI!")

if __name__ == "__main__":
    main()
