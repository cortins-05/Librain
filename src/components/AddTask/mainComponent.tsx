"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Spinner } from "../ui/spinner";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ResourceType = "url" | "file" | "text";

export default function MainComponentAddTask() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [resource, setResource] = useState<ResourceType | null>(null);
  const [value, setValue] = useState("");
  const [fileValue, setFileValue] = useState<File | null>(null);
  const [description, setDescription] = useState("");

  const hasInputValue = resource === "file" ? Boolean(fileValue) : value.trim().length > 0;
  const canSubmit = Boolean(resource && hasInputValue && description.trim().length > 0);

  async function saveTask() {
    const trimmedDescription = description.trim();
    const trimmedValue = value.trim();

    if (!resource || !trimmedDescription) return;
    if (resource === "file" && !fileValue) return;
    if (resource !== "file" && !trimmedValue) return;

    setLoading(true);

    try {
      const response =
        resource === "file"
          ? await fetch("/api/task", {
              method: "POST",
              body: (() => {
                const formData = new FormData();
                formData.append("resource", "file");
                formData.append("description", trimmedDescription);
                formData.append("value", fileValue?.name ?? "");
                if (fileValue) {
                  formData.append("file", fileValue);
                }
                return formData;
              })(),
            })
          : await fetch("/api/task", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                resource,
                value: trimmedValue,
                description: trimmedDescription,
              }),
            });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; stored?: { _id?: string }; ai?: { fallback?: boolean; error?: string | null } }
        | null;

      if (!response.ok) {
        const errorMessage = payload?.error ?? "No se pudo guardar la tarea";
        console.error("Error al guardar:", errorMessage);
        toast(errorMessage);
        return;
      }

      console.log("Guardado con id:", payload?.stored?._id);

      if (payload?.ai?.fallback) {
        toast(
          payload.ai.error
            ? `Guardado con fallback de IA: ${payload.ai.error}`
            : "Guardado con fallback de IA"
        );
      } else {
        toast("Guardado con exito");
      }

      router.push("/");
    } catch {
      toast("Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <span className="mt-3 flex items-center gap-3">
        <span>
          <span className="text-xl font-bold">1.</span> First, select a resource:
        </span>
        <Select
          onValueChange={(selected) => {
            setResource(selected as ResourceType);
            setValue("");
            setFileValue(null);
            setDescription("");
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Resource" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="url">URL</SelectItem>
              <SelectItem value="file">File</SelectItem>
              <SelectItem value="text">Text</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </span>

      {resource && (
        <div className="mt-4 flex flex-col gap-2.5">
          <span className="flex items-end gap-3">
            <span className="text-xl font-bold">2.</span>Then, set your resource:
          </span>

          {resource === "url" && (
            <Input
              placeholder="Url..."
              onChange={(event) => setValue(event.target.value)}
              value={value}
              type="text"
            />
          )}

          {resource === "text" && (
            <Textarea onChange={(event) => setValue(event.target.value)} value={value} />
          )}

          {resource === "file" && (
            <div className="flex flex-col gap-2">
              <Input
                type="file"
                accept="application/pdf,image/*"
                onChange={(event) => {
                  const selectedFile = event.target.files?.[0] ?? null;
                  setFileValue(selectedFile);
                  setValue(selectedFile?.name ?? "");
                }}
              />
              {fileValue && (
                <p className="text-sm text-muted-foreground">
                  Archivo seleccionado: {fileValue.name}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {hasInputValue && (
        <div className="mt-3 flex flex-col gap-3">
          <span className="flex items-end gap-3">
            <span className="text-xl font-bold">3.</span>Finally, add a short description:
          </span>
          <Textarea onChange={(event) => setDescription(event.target.value)} value={description} />
        </div>
      )}

      {canSubmit && (
        <Button onClick={saveTask} className="ml-auto w-fit" size="lg" disabled={loading}>
          {loading ? <Spinner className="h-full w-auto" /> : "Guardar"}
        </Button>
      )}
    </>
  );
}
