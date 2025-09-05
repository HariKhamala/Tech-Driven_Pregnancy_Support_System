import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, ComposedChart, Area
} from 'recharts';
import { Box, Typography } from '@mui/material';

const METRIC_COLORS = {
  heartRate: '#8884d8',
  systolicBP: '#82ca9d',
  diastolicBP: '#ffc658',
  spo2: '#ff8042',
  temperature: '#0088fe'
};

export default function RealtimeMetrics({ userId, onDataUpdate }) {
  const [metrics, setMetrics] = useState([]);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'smartwatchData'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            time: docData.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '--:--',
            heartRate: docData.heartRate || 0,
            systolicBP: docData.bloodPressure?.systolic || 0,
            diastolicBP: docData.bloodPressure?.diastolic || 0,
            spo2: docData.spo2 || 0,
            temperature: docData.bodyTemp || docData.temperature || 0,
            steps: docData.stepCount || docData.steps || 0
          };
        }).reverse();
        
        setMetrics(data);
        if (onDataUpdate && data.length > 0) {
          onDataUpdate(data[0]);
        }
      },
      (error) => {
        console.error("Error fetching metrics:", error);
      }
    );

    return () => unsubscribe();
  }, [userId, onDataUpdate]);

  return (
    <Box sx={{ height: 400 }}>
      <Typography variant="subtitle2" gutterBottom>
        Last Updated: {metrics[0]?.time || 'No data available'}
      </Typography>
      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart data={metrics}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis yAxisId="left" orientation="left" domain={[40, 180]}/>
          <YAxis yAxisId="right" orientation="right" domain={[0, 100]}/>
          <Tooltip />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="heartRate"
            stroke={METRIC_COLORS.heartRate}
            name="Heart Rate (bpm)"
            dot={false}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="systolicBP"
            stroke={METRIC_COLORS.systolicBP}
            name="Systolic BP"
            dot={false}
          />
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="spo2"
            fill={METRIC_COLORS.spo2}
            stroke={METRIC_COLORS.spo2}
            name="SpO₂ (%)"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
}