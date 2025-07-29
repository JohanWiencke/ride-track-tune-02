import { useState, useEffect } from 'react';

export const TimeBasedGreeting = () => {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const getGreeting = () => {
      const hour = new Date().getHours();
      const greetings = {
        morning: [
          "Good morning! Rise and grind.",
          "Morning sunshine! Fresh wheels for fresh adventures.",
          "Good morning, cyclist! Time to check your bike.",
          "Rise and shine! Your bike awaits.",
          "Good morning! Ready for today's adventure."
        ],
        afternoon: [
          "Good afternoon! Keep those wheels spinning.",
          "Afternoon vibes! Perfect riding weather.",
          "Good afternoon, rider! Keep the momentum rolling.",
          "Afternoon energy! Time for a ride.",
          "Good afternoon! Beautiful day for cycling."
        ],
        evening: [
          "Good evening! Perfect time to wind down.",
          "Evening cyclist! Time to review today's miles.",
          "Good evening! Rest those wheels well.",
          "Evening vibes! What a great day for riding.",
          "Good evening! Time to plan tomorrow's adventure."
        ],
        night: [
          "Good night! Sweet dreams of smooth rides.",
          "Late night maintenance session! Dedication pays off.",
          "Good night, cyclist! Tomorrow brings new miles.",
          "Midnight oil burning for bike maintenance! Impressive.",
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