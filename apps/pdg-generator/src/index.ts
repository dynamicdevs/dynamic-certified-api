import { AzureFunction, Context } from "@azure/functions"
import { bootstrap } from "apps/pdg-generator/src/main";

const timerTrigger: AzureFunction = async function (context: Context, myTimer: any): Promise<void> {
    bootstrap();
};

export default timerTrigger;
