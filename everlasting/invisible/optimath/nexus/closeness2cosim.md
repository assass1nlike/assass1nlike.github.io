# 定理 3.1 详细证明:梯度相似度是 Closeness 的上界

> **定理 3.1(Gradient Similarity Upper Bounds Closeness）.**
> 设 $\theta$ 为满足平稳性条件 $\nabla L_{\text{train}}(\theta)=\frac{1}{K}\sum_{k=1}^{K}\nabla L_k(\theta)=0$ 的收敛参数。设 $S_k=\{\vartheta\mid \exists\,\epsilon>0,\ \forall\,\vartheta'\in B_\epsilon(\vartheta),\ L_k(\vartheta)\le L_k(\vartheta')\}$ 为任务 $k$ 的局部极小值集合，$\theta_k^*=\arg\min_{\vartheta\in S_k}\|\vartheta-\theta\|_2$ 为离 $\theta$ 最近的极小值点。设
> $$
> \lambda_{\min}=\min_k \inf_{\xi\in[\theta,\theta_k^*]}\frac{(\theta-\theta_k^*)^\top}{\|\theta-\theta_k^*\|_2}\nabla^2 L_k(\xi)\frac{\theta-\theta_k^*}{\|\theta-\theta_k^*\|_2}>0,
> \qquad
> G=\sup_k\|\nabla L_k(\theta)\|_2 .
> $$
> 则各极小值点之间的 closeness 被如下界控制：
> $$
> \frac{1}{K}\sum_{k=1}^{K}\|\theta-\theta_k^*\|_2^2
> \ \le\
> \frac{1}{K\lambda_{\min}^2}\sum_{i\neq j}\bigl(-\nabla L_i(\theta)^\top\nabla L_j(\theta)\bigr)
> \ \le\
> \frac{G^2}{K\lambda_{\min}^2}\sum_{i\neq j}\bigl(1-\operatorname{CosSim}(\nabla L_i(\theta),\nabla L_j(\theta))\bigr).
> $$

为简洁起见，下文记 $\lambda:=\lambda_{\min}$。

---

## 证明概览

证明的核心是一条 **"代理替换链"**：从难以计算的 closeness 出发，逐步替换为在当前点 $\theta$ 即可直接计算、且更易优化的量。

$$
\underbrace{\text{closeness}}_{\substack{\text{难算，需找 }\theta_k^*}}
\ \xrightarrow[\text{Step 1}]{\text{中值定理}+\text{强凸}}\
\underbrace{\text{梯度范数平方和}}_{\text{可算}}
\ \xrightarrow[\text{Step 2}]{\text{收敛点合力为零}}\
\underbrace{\text{跨任务梯度内积}}_{\text{可算}}
\ \xrightarrow[\text{Step 3}]{\text{配凑非负项}}\
\underbrace{\text{余弦相似度}}_{\text{方向对齐度}}
$$

证明分为三个主要步骤：

1. **Step 1** — 通过**中值定理**将 closeness 与梯度范数联系起来；
2. **Step 2** — 利用总损失的**平稳性条件**分解梯度范数；
3. **Step 3** — 用**梯度范数上界与余弦相似度**界定交叉项。

---

## Step 1：将 Closeness 与梯度范数联系起来

**目标.** 证明单任务的 closeness 被该任务在 $\theta$ 处的梯度范数控制：
$$
\|\theta-\theta_k^*\|_2\ \le\ \frac{1}{\lambda}\,\|\nabla L_k(\theta)\|_2 .
$$

### 1.1 应用中值定理

回忆 $\theta_k^*$ 是 $\theta$ 在全局最优集合 $S_k$ 上的投影。由于 $\theta_k^*$ 是极小值点，有
$$
\nabla L_k(\theta_k^*)=0 .
$$

将**中值定理**应用于向量值函数 $\vartheta\mapsto\nabla L_k(\vartheta)$，则存在连接 $\theta_k^*$ 与 $\theta$ 的线段上的某一点 $\xi_k$，使得
$$
\nabla L_k(\theta)-\nabla L_k(\theta_k^*)=\nabla^2 L_k(\xi_k)\,(\theta-\theta_k^*).
\tag{46}
$$

代入 $\nabla L_k(\theta_k^*)=0$ 并取范数：
$$
\|\nabla L_k(\theta)\|_2=\bigl\|\nabla^2 L_k(\xi_k)\,(\theta-\theta_k^*)\bigr\|_2 .
\tag{47}
$$

> **直觉.** $\theta$ 处梯度的大小，完全由"位移 $\theta-\theta_k^*$"经过 Hessian 这个线性映射放大/缩小后的结果决定。离极小值越远（位移越大），梯度通常越大——但"通常"需要曲率假设来严格保证，这正是下一小步要做的。

### 1.2 用方向性强凸建立下界

引入沿位移方向的曲率条件。记单位位移向量
$$
u_k=\frac{\theta-\theta_k^*}{\|\theta-\theta_k^*\|_2},
$$
假设 Hessian 在该方向上的二次型有正下界：
$$
u_k^\top\nabla^2 L_k(\xi_k)\,u_k\ \ge\ \lambda\ >\ 0 .
\tag{48}
$$

> **关键.** 这是**"局部、方向性强凸"**假设：并不要求整个 Hessian 正定，**只要求在我们关心的那个位移方向上曲率至少为 $\lambda$**。这与全文哲学一致——LLM 损失曲面在大多数方向上近似二次，只需在"典型方向"上有曲率保证即可。

由该条件可推出
$$
\bigl\|\nabla^2 L_k(\xi_k)\,(\theta-\theta_k^*)\bigr\|_2\ \ge\ \lambda\,\|\theta-\theta_k^*\|_2 .
$$

**补充推导（原证明一笔带过的细节）.** 对任意向量 $v$ 与对称矩阵 $H$，由 Cauchy–Schwarz 不等式有 $\|Hv\|_2\,\|v\|_2\ge v^\top H v$。取 $v=\theta-\theta_k^*$、$H=\nabla^2 L_k(\xi_k)$：
$$
\bigl\|\nabla^2 L_k(\xi_k)(\theta-\theta_k^*)\bigr\|_2\cdot\|\theta-\theta_k^*\|_2
\ \ge\
(\theta-\theta_k^*)^\top\nabla^2 L_k(\xi_k)(\theta-\theta_k^*)
\ =\
u_k^\top\nabla^2 L_k(\xi_k)u_k\cdot\|\theta-\theta_k^*\|_2^2
\ \ge\
\lambda\,\|\theta-\theta_k^*\|_2^2 .
$$
两边约去一个 $\|\theta-\theta_k^*\|_2$ 即得上述下界。

### 1.3 整理得到单任务界并求平均

将 1.2 的下界代入 (47)：
$$
\|\nabla L_k(\theta)\|_2\ \ge\ \lambda\,\|\theta-\theta_k^*\|_2 ,
$$
重排即得 closeness 的上界：
$$
\|\theta-\theta_k^*\|_2\ \le\ \frac{1}{\lambda}\,\|\nabla L_k(\theta)\|_2 .
\tag{49}
$$

> **意义.** closeness $\|\theta-\theta_k^*\|$ 虽然要找极小值点才能算，但它被一个**在当前点 $\theta$ 就能直接算出来的梯度范数**所控制。曲率 $\lambda$ 越大（损失越陡峭/强凸），同样的梯度对应的位移就越小，界越紧。

两边平方并对所有 $K$ 个任务取平均：
$$
\frac{1}{K}\sum_{k=1}^{K}\|\theta-\theta_k^*\|_2^2\ \le\ \frac{1}{K\lambda^2}\sum_{k=1}^{K}\|\nabla L_k(\theta)\|_2^2 .
\tag{50}
$$

---

## Step 2：力平衡分解（Force Balance Decomposition）

**目标.** 将各任务梯度范数平方和 $\sum_k\|\nabla L_k(\theta)\|_2^2$ 替换为跨任务内积之和 $\sum_{i\neq j}\bigl(-\nabla L_i^\top\nabla L_j\bigr)$。

### 2.1 平稳性条件

由于 $\theta$ 是总损失的收敛参数，它满足平稳性条件（合力为零）：
$$
\sum_{k=1}^{K}\nabla L_k(\theta)=0 .
\tag{51}
$$

> **直觉（"力平衡"）.** 各任务把参数往各自方向"拉"，只有当这些"力"的合力为零时优化才停下来。

### 2.2 对零向量取范数平方，导出精确恒等式

既然该和为零向量，其范数平方也必为零。但将其展开（"平方和 $+$ 交叉项"）得到一个非平凡的恒等式：
$$
\Bigl\|\sum_{k=1}^{K}\nabla L_k(\theta)\Bigr\|_2^2
=\sum_{k=1}^{K}\|\nabla L_k(\theta)\|_2^2+\sum_{i\neq j}\nabla L_i(\theta)^\top\nabla L_j(\theta)=0 .
\tag{52}
$$

这里用到了恒等式 $\bigl\|\sum_k v_k\bigr\|^2=\sum_k\|v_k\|^2+\sum_{i\neq j}v_i^\top v_j$。重排各项即得一个**精确恒等式**，将梯度范数平方和与跨任务内积的负和联系起来：
$$
\sum_{k=1}^{K}\|\nabla L_k(\theta)\|_2^2=\sum_{i\neq j}\bigl(-\nabla L_i(\theta)^\top\nabla L_j(\theta)\bigr).
\tag{53}
$$

> **品味这个恒等式.** 在收敛点处，**所有任务梯度范数的平方和，恰好等于所有跨任务内积的负和**。它把"每个任务自己的梯度有多大"与"任务之间梯度有多对齐"严格地等同起来：合力为零意味着各任务梯度必须相互抵消，因此它们的（负向）内积必然累积起来匹配各自的范数。
>
> **注意前提.** 此恒等式依赖"$\theta$ 是收敛点"。若不在收敛点，$\sum_k\nabla L_k\neq 0$，这个把"自范数"转成"互内积"的精确等式就不成立。这说明该界刻画的是**收敛之后**的泛化性质。

### 2.3 得到定理的第一个不等式

将 (53) 代入 (50)：
$$
\boxed{\ \frac{1}{K}\sum_{k=1}^{K}\|\theta-\theta_k^*\|_2^2\ \le\ \frac{1}{K\lambda^2}\sum_{i\neq j}\bigl(-\nabla L_i(\theta)^\top\nabla L_j(\theta)\bigr)\ }
\tag{54}
$$

至此，closeness 已被"跨任务梯度内积"这个完全可在当前点计算的量所控制。

---

## Step 3：用余弦相似度界定交叉项

**目标.** 将内积 $-\nabla L_i^\top\nabla L_j$ 进一步替换为 $G^2(1-\operatorname{CosSim})$ 的形式，其中 $G=\sup_k\|\nabla L_k(\theta)\|_2$ 是梯度范数的上界。

> **为何需要这一步？** 内积形式 $-\nabla L_i^\top\nabla L_j$ 虽然可算，但混合了"梯度大小"与"梯度方向"两个因素。换成余弦相似度后，得到纯粹的**方向对齐度**度量（$\operatorname{CosSim}\in[-1,1]$），解耦了梯度幅度，更直观也更稳定——这正是 3.2 节真正去优化的对象。

### 3.1 内积的范数–余弦分解

$$
\nabla L_i(\theta)^\top\nabla L_j(\theta)=\|\nabla L_i(\theta)\|_2\,\|\nabla L_j(\theta)\|_2\,\operatorname{CosSim}\bigl(\nabla L_i(\theta),\nabla L_j(\theta)\bigr).
\tag{55}
$$

### 3.2 构造一个非负项

证明的核心技巧是配凑出如下非负量：
$$
\bigl(G^2-\|\nabla L_i(\theta)\|_2\,\|\nabla L_j(\theta)\|_2\bigr)\bigl(1-\operatorname{CosSim}(\nabla L_i(\theta),\nabla L_j(\theta))\bigr)\ \ge\ 0 .
\tag{56}
$$

**该项非负，因为两个因子都非负：**

- 第一个因子 $G^2-\|\nabla L_i\|_2\|\nabla L_j\|_2\ge 0$，因为 $G$ 是梯度范数上界，故 $\|\nabla L_i\|_2\|\nabla L_j\|_2\le G^2$；
- 第二个因子 $1-\operatorname{CosSim}\ge 0$，因为余弦相似度不超过 $1$。

两个非负数相乘，结果非负。

### 3.3 加项、展开、抵消、放缩

将这个非负项加到 $-\nabla L_i^\top\nabla L_j$ 上（加一个非负量只会让式子变大，不等号方向成立），再展开化简：
$$
\begin{aligned}
-\nabla L_i^\top\nabla L_j
&=-\|\nabla L_i\|_2\|\nabla L_j\|_2\,\operatorname{CosSim}\\[2pt]
&\le -\|\nabla L_i\|_2\|\nabla L_j\|_2\,\operatorname{CosSim}
+\bigl(G^2-\|\nabla L_i\|_2\|\nabla L_j\|_2\bigr)\bigl(1-\operatorname{CosSim}\bigr)\\[2pt]
&=G^2\bigl(1-\operatorname{CosSim}\bigr)-\|\nabla L_i\|_2\|\nabla L_j\|_2\\[2pt]
&\le G^2\bigl(1-\operatorname{CosSim}(\nabla L_i,\nabla L_j)\bigr).
\end{aligned}
\tag{57}
$$

**两个化简关键：**

1. **抵消.** 展开 $(G^2-\|\nabla L_i\|_2\|\nabla L_j\|_2)(1-\operatorname{CosSim})$ 得四项，其中的 $+\|\nabla L_i\|_2\|\nabla L_j\|_2\,\operatorname{CosSim}$ 恰好与前面的 $-\|\nabla L_i\|_2\|\nabla L_j\|_2\,\operatorname{CosSim}$ **抵消**，余下 $G^2(1-\operatorname{CosSim})-\|\nabla L_i\|_2\|\nabla L_j\|_2$。
2. **放缩.** 丢掉非负的被减项 $-\|\nabla L_i\|_2\|\nabla L_j\|_2$（去掉一个被减的非负数会让式子更大），不等号继续成立。

### 3.4 对所有 $i\neq j$ 求和

$$
\sum_{i\neq j}\bigl(-\nabla L_i(\theta)^\top\nabla L_j(\theta)\bigr)\ \le\ G^2\sum_{i\neq j}\bigl(1-\operatorname{CosSim}(\nabla L_i(\theta),\nabla L_j(\theta))\bigr).
\tag{58}
$$

---

## 合并：完成证明

将 Step 3 的结果 (58) 代入 Step 2 的结果 (54)，即得定理的完整双重不等式：
$$
\frac{1}{K}\sum_{k=1}^{K}\|\theta-\theta_k^*\|_2^2
\ \le\
\frac{1}{K\lambda^2}\sum_{i\neq j}\bigl(-\nabla L_i^\top\nabla L_j\bigr)
\ \le\
\frac{G^2}{K\lambda^2}\sum_{i\neq j}\bigl(1-\operatorname{CosSim}(\nabla L_i,\nabla L_j)\bigr).
\qquad\blacksquare
$$

---

## 证明要点回顾

整个证明是一条逐级放松的"代理替换链"，每一步都把一个量替换成一个**在当前点即可计算、更易优化**的量，代价是引入常数因子（$\tfrac{1}{\lambda^2}$、$G^2$）放松了界。

几个值得品味的地方：

- **Step 2 的恒等式是整个证明的枢纽**，它依赖"$\theta$ 是收敛点"使合力为零。脱离收敛点该精确等式即失效，因此本界刻画的是**收敛之后**的泛化性质。
- **Step 1 的强凸假设只要求沿位移方向成立**（$u_k^\top\nabla^2 L_k\,u_k\ge\lambda$），而非整个 Hessian 正定。这是全文哲学的体现：只需在"典型方向"上近似二次即可，无需全空间强凸这种过强假设。
- **Step 3 的配凑十分工整**——所构造非负项的两个因子，一个对应"梯度幅度被 $G$ 上界控制"，一个对应"余弦不超过 $1$"，分别是引入 $G$ 与引入 $\operatorname{CosSim}$ 的代价来源；加完之后 $\operatorname{CosSim}$ 的系数恰好凑成干净的 $G^2(1-\operatorname{CosSim})$。

**结论.** 将训练轨迹引导到一个 $\operatorname{CosSim}(\nabla L_i(\theta),\nabla L_j(\theta))$ 持续较高的区域，即可保证高 closeness（即小的距离 $\|\theta-\theta_k^*\|_2$）。这为后续 Nexus 优化器"通过最大化梯度相似度来优化 closeness"提供了理论依据。
