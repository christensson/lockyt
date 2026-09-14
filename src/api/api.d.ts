import { ExtractRPCFromHandler } from "../backend/types/utility";
import * as projectSettingsGETHandler from "../backend/router/project/settings/GET";
import * as projectSettingsPOSTHandler from "../backend/router/project/settings/POST";

export type ApiRouter = {
    project: {
        settings: {
            GET: ExtractRPCFromHandler<projectSettingsGETHandler.Handle>;
            POST: ExtractRPCFromHandler<projectSettingsPOSTHandler.Handle>;
        };
    };
};
