import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { chatService } from '../../services/chatService';

const Chatbot = () => {
  const [messages, setMessages] = useState([
    {
      text: 'Hello! I\'m your pregnancy support assistant. How can I help you today?',
      sender: 'bot',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      text: input,
      sender: 'user',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatService.getResponse(input);
      const botResponse = {
        text: response,
        sender: 'bot',
      };
      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error('Error getting response:', error);
      const errorResponse = {
        text: 'I apologize, but I\'m having trouble processing your request. Please try again later.',
        sender: 'bot',
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        width: '100%',
        maxWidth: 400,
        height: 500,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h6">Pregnancy Support Assistant</Typography>
      </Box>
      <List
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {messages.map((message, index) => (
          <React.Fragment key={index}>
            <ListItem
              sx={{
                justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <Paper
                sx={{
                  p: 1,
                  maxWidth: '70%',
                  bgcolor: message.sender === 'user' ? 'primary.light' : 'grey.100',
                  color: message.sender === 'user' ? 'white' : 'text.primary',
                  whiteSpace: 'pre-line',
                }}
              >
                <ListItemText primary={message.text} />
              </Paper>
            </ListItem>
            <Divider />
          </React.Fragment>
        ))}
        {isLoading && (
          <ListItem sx={{ justifyContent: 'flex-start' }}>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            <Typography>Thinking...</Typography>
          </ListItem>
        )}
        <div ref={messagesEndRef} />
      </List>
      <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          disabled={isLoading}
        />
        <IconButton
          color="primary"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Paper>
  );
};

export default Chatbot; 