All prompts have access to the project as context.

PROMPTS - 

this is a project created with npm create cloudflare@latest. Add a gitignore for this project


Context: 
Assignment - build a type of AI-powered application on Cloudflare. An AI-powered application should include the following components: * LLM (recommend using Llama 3.3 on Workers AI), or an external LLM of your choice * Workflow / coordination (recommend using Workflows, Workers or Durable Objects) * User input via chat or voice (recommend using Pages or Realtime) * Memory or state
I want to build a travel agent. It would include the following features - 
1. I should be able to chat with it and plan itineraries. 
2. I should be able to chat with it while i'm on site and ask it what's next and so forth, and, it should have access to the time and my location and tell me. Further, I should be able to modify things on the spot, and ask things like "what's a good cafe near me" and it should be able to tell me.
3. I should be able to set some global preferences for food and travel and aggressiveness of itinerary that is always included in context.
4. optional: I should be able to view itineraries on a calendar. 
I want a simple app. I don't need - 
1. Authentication or a fancy UI - just a sidebar with "New Itinerary" and access to existing ones, and maybe a button for the calendar. And one for "global preferences"

I want this to be a single page react app. maybe with some routing if necessary with react-router. The template already has LLama keybindings I think? Does it? What other things do I need to do to connect AI to this? The itinerary data model will be added as contexxt implicitly to the chat. Durable objects are to be used for state management and conversation history. 


do i even need vite?


amend the plan to note use react/vite anymore. the interface will be built on cloudflare pages, as will all the components. 


Test to make sure this project builds correctly. I will then run it and make sure it's behavior is correct


(5-10 prompts going back and forth to fix an api issue. Guiding it to add logging in various places and then guiding it to find a solution, pointing it to specific places in the code where the problem could be)


the ai is now thinking, however, it's responses aren't being rendered. All I see in response is an empty message bubble. Find the error on why the response isn't rendering.

(5-10 prompts going back and forth to fix the rendering issue in the same way)


The chat feature now works. Here are the current issues. fix them - 
1. The DO doesn't work. I don't see my chat history. Even if i switch to preferences and back to chat the chat gets cleared, let alone persist between different interactions.
2. The calendar fails to load, but I suspect it's because of this.
3. the new itinerary button doesn't work. It doesn't create a new chat. This wasn't working even when the persistent storage was working, before the fix to the chat response.


A few more things - In the storage, only my prompts are stored in the do. the response gets wiped out. Further, new itinerary doesn't store the current conversation somewhere else. It just wipes out the current conversation. the other one is not visible in the sidebar. I want the navigation to show my previous itineraries that I may be currently planning. This is all from the perspective of the frontend. I'm not sure if the backend handles this already or not. analyze why this is happening and fix it


I want to generate a plan for the following -- 
start off by cleaning the code a little. we did a few different versions of the chat to get the response to work. Clean up everything that's extraneous
Then, we need to fix the following problems - 
1. I need functionality to rename itineraries in the sidebar to give them actual labels, as well as deleting them.
2. The persistent storage still doesn't include conversation responses. It only includes my prompt. I want it to also include the responses in the conversation.


(5-10 prompts fixing these issues)


for the assistant messages, we receive it in markdown. I want to convert it from markdown to html. use the showdown library for this.


Explain to me the current data model with regards to the context for every prompt and the storage of itineraries, as well as how the preferences are added to the context.
(response)
So the itineraries are stored in the conversation DO?
(response)
In the itineraries tab, how are the itineraries retrieved?
(response)
well this retrieval is not working. I have tested with an itinerary for tokyo, and confirmed that it's been saved, however, the itineraries tab is empty. Take your time and try to find out why this is happening
(response)

(5-10 prompts fixing this issue)


i think the itinerary is formatted well enough. we can get rid of the calendar entirely. So let's get rid of that. Also, in the preferences, add a textbox for "Miscellaneous preferences", where more custom context can be added. Further, When specifying the schema for the itinerary, also specify that you want to first print a user friendly markdown of the itinerary, and then end the message with this json, starting with a line break and some magic sequence. When displaying assistant text, parse away this json and store it as the itinerary, and display everything in the user friendly format.


thanks. now, update the readme, explaining what the application does, what cloudflare tools it uses, go through the following list point by point and then address how each one of them is used - 

    LLM (recommend using Llama 3.3 on Workers AI), or an external LLM of your choice
    Workflow / coordination (recommend using Workflows, Workers or Durable Objects)
    User input via chat or voice (recommend using Pages or Realtime)
    Memory or state

Explain the template that was used. Explain the use of AI in building this in a day, and include a section on the limitations and potential failures due to lack of intensive testing in a day. Then explain how to run it. 
