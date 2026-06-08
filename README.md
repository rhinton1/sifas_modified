# SiFAS
A full-stack mobile application where users upload a photo, create a customized AI avatar, and have real-time voice-and-video conversations with it.

## Architecture Overview
The application is built using a microservices architecture, with the following key components:

```
React Native (Expo UI) ──► Mobile App
      │
      ├── REST API ──► Django + DRF (Django REST Framework)
      │
```