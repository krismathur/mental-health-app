const MEDITATION_PROGRAM_SECTIONS = [
    {
        minutes: 2,
        label: "2 Minute Programs",
        programs: [
            {
                id: "quick-calm-spark",
                name: "Quick Calm Spark",
                subtitle: "A fast reset when you only have a couple minutes.",
                duration: "2 min",
                segments: [
                    { text: "Welcome to Quick Calm Spark. Sit tall and take one slow breath in through your nose.", pauseAfter: 10 },
                    { text: "Breathe out through your mouth and let your shoulders drop. You are safe in this moment.", pauseAfter: 12 },
                    { text: "Say quietly: I am here. I am ready enough for right now.", pauseAfter: 12 },
                    { text: "Picture yourself taking one confident step into your next rep, play, or practice.", pauseAfter: 10 },
                    { text: "Quick Calm Spark is complete. Carry this calm into your next move.", pauseAfter: 0 }
                ]
            },
            {
                id: "snap-focus-boost",
                name: "Snap Focus Boost",
                subtitle: "Lock your attention back in before you compete.",
                duration: "2 min",
                segments: [
                    { text: "Welcome to Snap Focus Boost. Look at one spot in front of you and soften your gaze.", pauseAfter: 10 },
                    { text: "Choose one focus cue like next play, eyes up, or stay sharp.", pauseAfter: 12 },
                    { text: "Repeat your cue three times in your mind. Feel your attention narrow.", pauseAfter: 12 },
                    { text: "Breathe in for four and out for six. Distractions can wait.", pauseAfter: 10 },
                    { text: "Snap Focus Boost is complete. Go compete with clear eyes.", pauseAfter: 0 }
                ]
            }
        ]
    },
    {
        minutes: 5,
        label: "5 Minute Programs",
        programs: [
            {
                id: "calm-before-storm",
                name: "Calm Before the Storm",
                subtitle: "Settle your nerves and show up ready before the game starts.",
                duration: "5 min",
                segments: [
                    { text: "Welcome to Calm Before the Storm. Find a comfortable seat. Let your shoulders drop away from your ears.", pauseAfter: 12 },
                    { text: "Close your eyes if that feels safe. Take a slow breath in through your nose for four counts.", pauseAfter: 18 },
                    { text: "Hold that breath gently for two counts. Then breathe out through your mouth for six counts.", pauseAfter: 20 },
                    { text: "Your body is not your enemy today. It is your teammate. Feel your feet grounded beneath you.", pauseAfter: 15 },
                    { text: "Picture the court, field, or track in front of you. See yourself walking in with steady eyes and calm breath.", pauseAfter: 18 },
                    { text: "Repeat this in your mind: I am ready. I am prepared. I trust my training.", pauseAfter: 20 },
                    { text: "Let go of the fear of messing up. You are allowed to compete without carrying every past mistake.", pauseAfter: 18 },
                    { text: "Breathe in confidence. Breathe out pressure. In again. Out again. Slow and steady.", pauseAfter: 22 },
                    { text: "Think of one thing you do well. Lock onto that strength like a spotlight.", pauseAfter: 18 },
                    { text: "When you open your eyes, carry this calm with you. You are not trying to be perfect. You are here to compete.", pauseAfter: 15 },
                    { text: "Calm Before the Storm is complete. Step into your game with a clear mind and strong heart.", pauseAfter: 0 }
                ]
            },
            {
                id: "lock-in-focus-flow",
                name: "Lock-In Focus Flow",
                subtitle: "Train your attention to stay locked in when distractions show up.",
                duration: "5 min",
                segments: [
                    { text: "Welcome to Lock-In Focus Flow. Sit tall. Place both feet flat and hands relaxed.", pauseAfter: 12 },
                    { text: "Bring your attention to the sound of your breathing. Nothing else matters for this moment.", pauseAfter: 18 },
                    { text: "When a random thought appears, label it as a distraction and let it float away like a cloud.", pauseAfter: 20 },
                    { text: "Now choose one focus cue for today. It can be short, like eyes up, quick feet, or next play.", pauseAfter: 18 },
                    { text: "Say your focus cue silently three times. Feel how your mind sharpens each time you repeat it.", pauseAfter: 20 },
                    { text: "Imagine practice or a game moment where your focus drifts. See yourself returning to your cue immediately.", pauseAfter: 22 },
                    { text: "Strong athletes do not stay perfect. They recover fast. Recovery is a skill you are building right now.", pauseAfter: 18 },
                    { text: "Breathe in for four. Breathe out for six. With every exhale, make your attention more steady.", pauseAfter: 20 },
                    { text: "Picture your eyes tracking the ball, the play, or the movement in front of you with full presence.", pauseAfter: 18 },
                    { text: "Your mind is like a muscle. Every time you bring it back, you get stronger.", pauseAfter: 20 },
                    { text: "Lock-In Focus Flow is complete. Carry your cue with you and return to it the moment you drift.", pauseAfter: 0 }
                ]
            },
            {
                id: "bounce-back-reset",
                name: "Bounce Back Reset",
                subtitle: "Release a tough moment and reset your mindset for the next play.",
                duration: "5 min",
                segments: [
                    { text: "Welcome to Bounce Back Reset. This session is for after something went wrong. You are still in the game.", pauseAfter: 14 },
                    { text: "Take a deep breath in. As you breathe out, imagine letting the last play leave your body.", pauseAfter: 20 },
                    { text: "What happened is over. It does not get to decide the rest of your performance.", pauseAfter: 18 },
                    { text: "Place a hand on your chest. Feel your heartbeat. You are still here. You still have chances ahead.", pauseAfter: 20 },
                    { text: "Say quietly: one play does not define me. My next response is what matters now.", pauseAfter: 18 },
                    { text: "Picture yourself making the adjustment your coach would want. See the correction clearly.", pauseAfter: 20 },
                    { text: "Breathe in patience. Breathe out frustration. You are resetting, not quitting.", pauseAfter: 22 },
                    { text: "Think of a time you bounced back before. You have proof you can do hard things.", pauseAfter: 18 },
                    { text: "Set one small target for the next minute of play. Just one. Keep it simple and doable.", pauseAfter: 20 },
                    { text: "Stand a little taller. Relax your jaw. Unclench your hands. Ready is a choice.", pauseAfter: 18 },
                    { text: "Bounce Back Reset is complete. Take your next play with a fresh mind and competitive fire.", pauseAfter: 0 }
                ]
            },
            {
                id: "peaceful-power-down",
                name: "Peaceful Power Down",
                subtitle: "Slow your mind and body after training or competition.",
                duration: "5 min",
                segments: [
                    { text: "Welcome to Peaceful Power Down. Lie down or sit back. Let the day begin to soften.", pauseAfter: 14 },
                    { text: "You worked today. Your effort matters, even on the days that felt messy.", pauseAfter: 18 },
                    { text: "Breathe in slowly for four counts. Breathe out for eight counts. Long exhales tell your body it is safe to relax.", pauseAfter: 22 },
                    { text: "Starting at your toes, notice any tightness. Breathe into it and let it loosen on the exhale.", pauseAfter: 20 },
                    { text: "Move your attention up through your legs, stomach, chest, and shoulders. Release what you do not need to carry into rest.", pauseAfter: 22 },
                    { text: "Say to yourself: I am allowed to rest. Recovery is part of becoming a better athlete.", pauseAfter: 18 },
                    { text: "Picture a calm place. Maybe a quiet field at sunset, or your room with soft light.", pauseAfter: 20 },
                    { text: "Let your thoughts slow down. If worries appear, thank them and set them aside for tomorrow.", pauseAfter: 22 },
                    { text: "Breathe naturally now. Feel your body getting heavier, supported, and still.", pauseAfter: 20 },
                    { text: "You showed up today. That counts. Tomorrow you can build again.", pauseAfter: 18 },
                    { text: "Peaceful Power Down is complete. Rest well and let your mind and body recharge.", pauseAfter: 0 }
                ]
            }
        ]
    },
    {
        minutes: 10,
        label: "10 Minute Programs",
        programs: [
            {
                id: "champions-calm-journey",
                name: "Champion's Calm Journey",
                subtitle: "A deeper pre-game calm to steady your body and belief.",
                duration: "10 min",
                segments: [
                    { text: "Welcome to Champion's Calm Journey. This is your time to build calm that lasts through pressure.", pauseAfter: 16 },
                    { text: "Sit comfortably and lengthen your spine. Relax your face, jaw, and hands.", pauseAfter: 20 },
                    { text: "Breathe in through your nose for four. Hold for two. Breathe out for six.", pauseAfter: 24 },
                    { text: "Repeat that breathing pattern two more times at your own pace.", pauseAfter: 28 },
                    { text: "Feel your heartbeat. It is proof that your body is ready to support you today.", pauseAfter: 20 },
                    { text: "Picture arriving at your venue. See yourself moving with purpose, not panic.", pauseAfter: 22 },
                    { text: "Remember a moment you competed well. Notice the confidence in that memory.", pauseAfter: 24 },
                    { text: "Say quietly: I trust my preparation. I trust my effort. I trust myself to respond.", pauseAfter: 22 },
                    { text: "Let go of needing a perfect game. Commit to a strong next play instead.", pauseAfter: 24 },
                    { text: "Scan your body from head to toe. Release tension anywhere you find it.", pauseAfter: 26 },
                    { text: "Breathe in courage. Breathe out doubt. Again. Slower each time.", pauseAfter: 28 },
                    { text: "Choose one word to carry today. It could be steady, fierce, patient, or ready.", pauseAfter: 22 },
                    { text: "Repeat your word with each exhale. Let it become part of your rhythm.", pauseAfter: 26 },
                    { text: "See yourself handling a tough moment with composure and quick recovery.", pauseAfter: 24 },
                    { text: "You are not chasing approval. You are building mastery one breath at a time.", pauseAfter: 22 },
                    { text: "Champion's Calm Journey is complete. Step forward with calm confidence.", pauseAfter: 0 }
                ]
            },
            {
                id: "deep-recovery-wave",
                name: "Deep Recovery Wave",
                subtitle: "A longer reset to help your mind and muscles recover.",
                duration: "10 min",
                segments: [
                    { text: "Welcome to Deep Recovery Wave. You finished working hard. Now your recovery begins.", pauseAfter: 16 },
                    { text: "Lie down or recline. Let your body feel supported by the ground or chair.", pauseAfter: 22 },
                    { text: "Breathe in for four and out for eight. Long exhales signal safety to your nervous system.", pauseAfter: 28 },
                    { text: "Notice your legs. Let them become heavier and more relaxed.", pauseAfter: 24 },
                    { text: "Notice your stomach and chest rising and falling without force.", pauseAfter: 24 },
                    { text: "Soften your shoulders away from your ears. Unclench your hands completely.", pauseAfter: 22 },
                    { text: "Say to yourself: Recovery is training. Rest makes me stronger.", pauseAfter: 24 },
                    { text: "If your mind replays mistakes, thank those thoughts and let them drift away.", pauseAfter: 26 },
                    { text: "Picture a gentle wave washing over you, carrying fatigue out with each breath.", pauseAfter: 28 },
                    { text: "Think of one thing you did well today, no matter how small.", pauseAfter: 22 },
                    { text: "Think of one thing you learned today. Growth is always happening.", pauseAfter: 24 },
                    { text: "Breathe naturally now. Slow. Easy. No rush.", pauseAfter: 26 },
                    { text: "Feel gratitude for your body showing up for you.", pauseAfter: 24 },
                    { text: "Set a gentle intention for tomorrow: show up, listen, and keep building.", pauseAfter: 22 },
                    { text: "Deep Recovery Wave is complete. Let your mind and body restore.", pauseAfter: 0 }
                ]
            }
        ]
    },
    {
        minutes: 20,
        label: "20 Minute Programs",
        programs: [
            {
                id: "mental-strength-marathon",
                name: "Mental Strength Marathon",
                subtitle: "A full mental training session for focus, confidence, and resilience.",
                duration: "20 min",
                segments: [
                    { text: "Welcome to Mental Strength Marathon. This is a deep training session for your mind.", pauseAfter: 18 },
                    { text: "Sit tall with both feet grounded. Place your hands on your thighs and relax your shoulders.", pauseAfter: 24 },
                    { text: "For the next minute, follow your natural breath without changing it.", pauseAfter: 35 },
                    { text: "Now breathe in for four, hold for two, and breathe out for six.", pauseAfter: 28 },
                    { text: "Repeat that pattern calmly. Your breath is your anchor today.", pauseAfter: 32 },
                    { text: "Bring attention to your body. Notice areas of tension without judging them.", pauseAfter: 26 },
                    { text: "Starting at your feet, relax each area as you move upward.", pauseAfter: 30 },
                    { text: "Soften your legs, hips, stomach, chest, shoulders, and face.", pauseAfter: 32 },
                    { text: "Choose one focus cue for competition. Keep it short and powerful.", pauseAfter: 24 },
                    { text: "Repeat your cue ten times in your mind, steady and clear.", pauseAfter: 30 },
                    { text: "Picture a game situation where pressure rises. See yourself staying composed.", pauseAfter: 28 },
                    { text: "See yourself using your cue and taking the next right action.", pauseAfter: 30 },
                    { text: "Now picture a mistake happening. See yourself resetting quickly.", pauseAfter: 28 },
                    { text: "Say: I respond, I recover, I keep competing.", pauseAfter: 26 },
                    { text: "Remember a challenge you overcame. Feel that resilience in your chest.", pauseAfter: 30 },
                    { text: "Breathe in self-belief. Breathe out fear of failure.", pauseAfter: 32 },
                    { text: "Visualize your best skills one by one. See them clearly and confidently.", pauseAfter: 34 },
                    { text: "Set three process goals for your next practice or game. Not outcome goals. Process goals.", pauseAfter: 30 },
                    { text: "Goal one: stay present. Goal two: communicate. Goal three: recover fast.", pauseAfter: 28 },
                    { text: "Repeat those goals quietly. Make them feel real and doable.", pauseAfter: 32 },
                    { text: "Scan your body again. Release any tension that returned.", pauseAfter: 30 },
                    { text: "Breathe slowly and naturally. You are building a stronger mental game.", pauseAfter: 34 },
                    { text: "When you are ready, open your eyes and carry this strength with you.", pauseAfter: 24 },
                    { text: "Mental Strength Marathon is complete. Well done today.", pauseAfter: 0 }
                ]
            },
            {
                id: "night-reset-sanctuary",
                name: "Night Reset Sanctuary",
                subtitle: "A long wind-down to release the day and prepare deep rest.",
                duration: "20 min",
                segments: [
                    { text: "Welcome to Night Reset Sanctuary. This is your space to slow down and let go.", pauseAfter: 18 },
                    { text: "Lie down comfortably. Allow your body to feel heavy and supported.", pauseAfter: 26 },
                    { text: "Close your eyes and take three slow breaths at your own pace.", pauseAfter: 35 },
                    { text: "Breathe in for four and out for eight. Let each exhale be longer than the inhale.", pauseAfter: 32 },
                    { text: "Notice the day behind you. You do not need to solve everything tonight.", pauseAfter: 28 },
                    { text: "Starting at your toes, relax each muscle group as you move upward.", pauseAfter: 34 },
                    { text: "Legs relax. Hips relax. Stomach relaxes. Chest softens. Shoulders drop.", pauseAfter: 36 },
                    { text: "Face softens. Jaw unclenches. Forehead smooths.", pauseAfter: 30 },
                    { text: "If thoughts about tomorrow appear, place them on a shelf for later.", pauseAfter: 28 },
                    { text: "Picture a peaceful sanctuary. Maybe warm light, quiet air, and open space.", pauseAfter: 32 },
                    { text: "Walk into that sanctuary in your mind. Feel safe and unhurried.", pauseAfter: 34 },
                    { text: "Recall one moment of effort today that you respect in yourself.", pauseAfter: 28 },
                    { text: "Recall one moment of kindness you gave or received today.", pauseAfter: 30 },
                    { text: "Say quietly: I am allowed to rest. My body repairs when I slow down.", pauseAfter: 32 },
                    { text: "Breathe naturally now. No forcing. Just easy rhythm.", pauseAfter: 36 },
                    { text: "If your mind wanders, gently return to the feeling of the breath.", pauseAfter: 34 },
                    { text: "Imagine tension leaving your body like soft light fading into the night.", pauseAfter: 36 },
                    { text: "Set one gentle intention for tomorrow: show up with patience and effort.", pauseAfter: 28 },
                    { text: "Thank yourself for taking this time to recover.", pauseAfter: 30 },
                    { text: "Stay here as long as you need. Let sleep arrive when it is ready.", pauseAfter: 34 },
                    { text: "Night Reset Sanctuary is complete. Rest well, athlete.", pauseAfter: 0 }
                ]
            }
        ]
    }
];

const MEDITATION_PROGRAMS = MEDITATION_PROGRAM_SECTIONS.flatMap(function (section) {
    return section.programs;
});
