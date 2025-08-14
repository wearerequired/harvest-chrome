# required Time Tracker

Track time from Chrome and within popular project management tools. Fork of the [Harvest Chrome Extension](https://chrome.google.com/webstore/detail/harvest-time-tracker/fbpiglieekigmkeebmeohkelfpjjlaia?hl=en).

## Changes
- Adds additional support for Helpscout and Basecamp 2.

## Update from upsteam
- Download the .CRX file for the [Harvest Chrome Extension](https://chrome.google.com/webstore/detail/harvest-time-tracker/fbpiglieekigmkeebmeohkelfpjjlaia?hl=en) using [CRX viewer](https://robwu.nl/crxviewer/)
- Using [CRX Extractor](https://crxextractor.com/) extract the source code from the .CRX file.
- Unzip the source code and copy to the git repository.
- Compare the changes in the git and remove the updates that override our changes.
- Commit the changes.
- Create ZIP file of folder `git archive --format=zip --output harvest-chrome.zip master`
- Upload the ZIP file to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/f18e8adb-99dc-4cdb-8080-2613a4fb568b/molohbmpdeahlajdfnjppdlbbbgbbgca/edit/package?hl=en).
