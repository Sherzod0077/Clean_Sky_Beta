# Clean_Sky_Beta
Beta version of an air quality monitoring app using NASA satellite data to estimate city-level AQI. The system aggregates regional geospatial data and applies rule-based logic to generate clear health recommendations. Developed as an independent project focused on environmental monitoring and data-driven decision support.
Motivation

The project was inspired by growing environmental concerns in Uzbekistan, particularly the visible degradation of air and water quality in urban areas. While air pollution data exists in global satellite datasets, it is rarely presented in a form that is accessible or actionable for local populations.

This project aims to bridge that gap by transforming raw satellite data into city-level Air Quality Index (AQI) estimates and practical recommendations.

Data Sources

NASA satellite air pollution datasets
Used as the primary source of atmospheric data.
The data is regional in nature and requires aggregation before being applied at the city level.

System Design

The application follows a simple, modular architecture:

Data Collection
Satellite air quality data is retrieved from NASA datasets.

Geospatial Processing
Regional satellite data is aggregated and mapped to city boundaries to produce approximate city-level AQI values.

Decision Logic
AQI values are classified using predefined health thresholds to determine pollution levels and associated risks.

Natural Language Output
Google Gemini is used to generate clear, human-readable health recommendations based on structured AQI data.

Key Features

Satellite-based air quality data processing

City-level AQI estimation through spatial aggregation

Rule-based health risk categorization

AI-assisted generation of user-friendly recommendations

Focus on clarity and accessibility rather than raw data display

Technical Challenges

One of the main challenges was handling geospatial data correctly.
Early versions of the system treated regional satellite readings as point-specific city data, which led to inaccurate results.

Solving this required redesigning the backend logic to properly aggregate geographic data and align it with administrative boundaries. This experience highlighted the difference between theoretical data handling and real-world environmental systems.

Project Status

🚧 Beta version

Limited number of supported cities

Accuracy depends on satellite data resolution

Further validation and scaling are planned

Future Improvements

Expanding city coverage

Improving spatial resolution and aggregation methods

Deploying the system using cloud infrastructure

Integrating additional environmental data sources

Disclaimer

This project is intended for educational and experimental purposes only.
All AQI values are estimates derived from publicly available satellite data and should not be considered official or medical advice.

Author

Bobojonov Sherzod
Computer Science applicant
Interest areas: data-driven systems, environmental monitoring, decision support systems
