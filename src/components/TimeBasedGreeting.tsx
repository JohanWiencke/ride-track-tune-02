import { useState, useEffect } from 'react';

export const TimeBasedGreeting = () => {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const getGreeting = () => {
      const hour = new Date().getHours();
      const greetings = {
        morning: [
          "Good morning! Ready to ride?",
          "Rise and grind! Time to check your bike.",
          "Good morning, cyclist! Let's maintain those rides.",
          "Morning sunshine! Your bike awaits.",
          "Good morning! Fresh wheels for fresh adventures."
        ],
        afternoon: [
          "Good afternoon! How are your rides going?",
          "Afternoon check-in! Keep those wheels spinning.",
          "Good afternoon, rider! Time for a maintenance break?",
          "Afternoon vibes! Your bike is calling.",
          "Good afternoon! Keep the momentum rolling."
        ],
        evening: [
          "Good evening! Winding down after a great ride?",
          "Evening cyclist! Time to review today's miles.",
          "Good evening! How did your bike perform today?",
          "Evening check-in! Ready for tomorrow's adventure?",
          "Good evening! Rest those wheels well."
        ],
        night: [
          "Good night! Sweet dreams of smooth rides.",
          "Late night maintenance session? Dedication!",
          "Good night, cyclist! Tomorrow brings new miles.",
          "Burning the midnight oil on bike maintenance?",
          "Good night! Your bike will be ready for tomorrow."
        ]
      };

      let timeOfDay: keyof typeof greetings;
      
      if (hour >= 5 && hour < 12) {
        timeOfDay = 'morning';
      } else if (hour >= 12 && hour < 17) {
        timeOfDay = 'afternoon';
      } else if (hour >= 17 && hour < 22) {
        timeOfDay = 'evening';
      } else {
        timeOfDay = 'night';
      }

      const randomGreeting = greetings[timeOfDay][Math.floor(Math.random() * greetings[timeOfDay].length)];
      setGreeting(randomGreeting);
    };

    getGreeting();
    // Update greeting every hour
    const interval = setInterval(getGreeting, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-muted-foreground text-sm mb-6 text-center animate-fade-in">
      {greeting}
    </div>
  );
};