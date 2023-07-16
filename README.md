# Anima Prime: REBOOT

This system is a modified implementation of the **Anima Prime: Resurgence** RPG system with modifications to make it more suited to use in Virtual Tabletops, mainly Foundry VTT. This project aims to be a hack of the original Anima Prime: Resurgence 

 The original *Anima Prime: Resurgence* system was created by C. W. Griffen and can be found at at https://cwgriffen.itch.io/anima-prime-resurgence

## Modifications

As some people are getting the link and might be interested in trying out the system, I've compiled a quick summary of the modifications done to the *Resurgence* version of the system so you're not entirely lost if you're interested in downloading it and trying out yourselves:

- Backgrounds do not give you abilities anymore. Instead, it comfers you 3 traits/skills

- There are no "training" or "skills". Those were merged into **Traits and Abilities**, which are freeform traits and skills (as the name says) which are given by both your profession (3 of them) and your background (more 3), for a total of 6 abilities for a starting character. Abilities can be a skill like "Driving" or "Animal Handling" or "Knowledge: History", or they can also represent a trait like "High Intelligence", "High Agility" or "High Charisma". A comprehensive list of traits and abilities is planned for the Anima Prime: REBOOT release  

  Those function as described in the "unofficial Anima Prime 1.5" document (that can be found at https://divnull.com/blog/2019/anima-prime-1-5/), as follows:

  *When you attempt to do something difficult or opposed by another character during a character scene, describe to the GM what you’re doing and figure out together which skill that uses. The GM will also inform you what the difficulty of the roll is (a number between 3 for regular and 6 for nearly-impossible attempts). Then roll your skill rating in dice; if you don’t have that skill, roll two dice instead **(that is accomplished by using the GENERIC ROLL button at the top of the section)**.Count the number of dice that show the difficulty or higher as successes and check the result below*

   - 0 successes: Failure. Whatever you were trying to do it not accomplished
   - 1 success: Partial Success. Either something goes bad with the attempt, or you only get a general, far0sighted result.
   - 2-3 successes: Complete Success. You accomplish what you were trying to do
   - 4+ successes: Extra/Critical Success. You accomplish what you were trying to do, plus some extra effect.

  Upon character creation, the owner is supposed to take their initial traits/abilities and choose one to set at rating 5, and two to set at rating 4, leaving the remainder at rating 3.

- A new type of combat unit - ALLIES. These are characters that are controlled by the GM but they fight for the friendly team. They can only take a turn after all player characters had taken a turn, and they work as adversities (can't do style maneuvers)

- The Weakened condition, as well as strike targets with resistance, now try to remove dice from the least relevant first. The order of attempted removing is: condition dice, bonus dice, threat/progress dice, action dice, strike dice, and ability dice last.

- GOALS REWORK. Instead of having two "sides", goals now are attributed a type: **FRIENDLY** or **HOSTILE**. same as units, who can also be either Friendly (Characters and Allies) or Hostile (Adversities and Hazards). When attempting goals, anyone can attempt an achievement action on any goal. When trying to advance a goal of your own type, rolls will function normally. When rolling an achievement on a goal of the opposite type, however, that represents you are HAMPERING progress on that goal, trying to keep the other side from completing it. Offer a description of what are you doing to sabotage the goal or make it more difficult for your opponents to achieve. Mechanically, this means:
  - You can't augment your roll with any type of dice other than strike or action dice.
  - instead of adding progress and/or completing the goal, successes in that roll will SUBTRACT progress from the goal, to a minimum of 0.

- THREAT/PROGRESS REWORK. Currently we're undergoing a complete rework of the threat/progress dice system, as follows:
  - Threat/Progress is always rolled full at every strike attempt. failing the roll with those dice do not lead to the dice being lost. Threat is always gained, never lost (unless with specific powers/abilities that do so). The reasoning behind this rework is that most players felt the risk of a bad roll setting back all the work done in previous turns was a major downpoint of the system.  
  - there's a cap in how much threat a strike/achievement action can inflict, and that cap is the strike/achievement's ability dice + 1, not counting ability modifiers. I.e. a strike with Roll = 1d has a threat cap if 2, while a strike with a roll of 2d+1 has a threat cap of 3. 
  - As atacking an enemy with weakness to the strike doubles the effective ability dice for the roll, so do the threat cap is increased accordingly.
  - only "natural" dice can inflict threat. Natural dice are ability dice, strike dice and action dice. This means that threat/progress dice, bonus dice, and dice gained from any other means (like the empowered condition) work similarly to ability modifiers - while they count for checking if the number of successes of the roll beats the defense of the target, those dice will not cound for effects of adding threat.

### Modifications currently under playtest (those can be changed/refined at any moment)

- EXPERIENCE POINTS SYSTEM: A proposed character evolution system is being playtested at the moment using progression trees similar to the ones proposed in Anime Prime: Resurgence, with a few spins:
  - Instead of buying "evolution items" one at a time, characters spend EXP to buy items, with cost as follows:
    - Ability Points (used to buy a new trait/ability at rtating 3 or raise the rating of an existing one by 1): **1 EXP**
    - Defense (raise character defense by 1): **2 EXP**
    - Resistance (raise a particular resistance of the character by 1): **2 EXP**
    - Action Point (raises the action pool size by 1): **2 EXP**
    - HP (raise max HP by 1): **4 EXP**
    - Action Card (character gains a new action card to use in combat): **4 EXP**
    - Class Evolution: **6 EXP**
  - Characters gain 1 EXP per session, plus one for each personality trait that was used in a relevant manner throughout the session (to a maximum of 2). Additionally, the GM can award players "EXP Fragments" at their discretion
  - A player can, at any time (even during a session) trade EXP fragments to full-fledged EXP, at a rate of four-to-one. EXP gained in that fashion can be spent IMMEDIATELY, even if mid-session or even mid-combat.
  - At the beginning of each combat, players can spend 1 EXP fragment to gain 2 "rerolls" for the upcoming combat. Personality trait marks and the rerolls tied to it have been discontinued. This is now the means for players to get dice rerolls.

## TODO / Roadmap
- More playtesting, MUCH MORE PLAYTESTING
- Add Localization
- Write the PDF document for Anima Prime: REBOOT
